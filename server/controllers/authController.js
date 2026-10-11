import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import Admin from '../models/Admin.js';
import Warden from '../models/Warden.js';
import Student from '../models/Student.js';
import Institution from '../models/Institution.js';
import SystemLog from '../models/SystemLog.js';
import { generateToken, getValidatedJwtSecret } from '../middleware/authMiddleware.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

// Helper: Secure hash with SHA-256
const hashToken = (token) => crypto.createHash('sha256').update(String(token).trim()).digest('hex');

// Unified generic credential error message to prevent account enumeration
const INVALID_CREDENTIALS_MSG = 'Invalid credentials. Please check your email and password.';

// Helper to record failed login attempts and apply lockout
const recordFailedAttempt = async (userDoc) => {
  if (!userDoc) return false;
  userDoc.failed_login_attempts = (userDoc.failed_login_attempts || 0) + 1;
  if (userDoc.failed_login_attempts >= 5) {
    userDoc.lockout_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
    await userDoc.save();
    return true;
  }
  await userDoc.save();
  return false;
};

// Helper to clear failed attempts upon successful login
const recordSuccessfulLogin = async (userDoc) => {
  if (!userDoc) return;
  if (userDoc.failed_login_attempts > 0 || userDoc.lockout_until) {
    userDoc.failed_login_attempts = 0;
    userDoc.lockout_until = null;
    await userDoc.save();
  }
};

// @desc    Unified Login for Admin, Warden, Student
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let userType = req.body.user_type || req.body.role;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If user_type is omitted by the client, auto-resolve account across Admin, Warden, Student collections
    if (!userType || typeof userType !== 'string') {
      const adminCandidate = await Admin.findOne({
        $or: [{ email: normalizedEmail }, { username: email.trim().toLowerCase() }],
      });
      if (adminCandidate) {
        userType = 'admin';
      } else {
        const wardenCandidate = await Warden.findOne({ email: normalizedEmail });
        if (wardenCandidate) {
          userType = 'warden';
        } else {
          userType = 'student';
        }
      }
    }

    const cleanUserType = typeof userType === 'string' ? userType.trim().toLowerCase() : '';

    // 1. ADMIN / INSTITUTION_ADMIN LOGIN
    if (cleanUserType === 'admin') {
      const admin = await Admin.findOne({
        $or: [{ email: normalizedEmail }, { username: email.trim().toLowerCase() }],
      }).select('+password +lockout_until +failed_login_attempts +mfa_enabled');

      // Check account lockout
      if (admin && admin.lockout_until && admin.lockout_until > new Date()) {
        const remainingMinutes = Math.ceil((admin.lockout_until.getTime() - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s) or reset your password.`,
        });
      }

      if (!admin || !(await admin.matchPassword(password))) {
        if (admin) {
          const isNowLocked = await recordFailedAttempt(admin);
          if (isNowLocked) {
            return res.status(423).json({
              success: false,
              message: 'Account is temporarily locked due to excessive failed attempts. Try again in 15 minute(s) or reset your password.',
            });
          }
        }
        return res.status(401).json({
          success: false,
          message: INVALID_CREDENTIALS_MSG,
        });
      }

      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Your admin account has been deactivated. Contact the platform administrator.',
        });
      }

      if (admin.is_email_verified === false) {
        return res.status(403).json({
          success: false,
          email_unverified: true,
          email: admin.email,
          message: 'Your email address is not verified. Please verify your email before logging in.',
        });
      }

      // For institution_admin, verify the institution exists and is Approved
      let institutionInfo = null;
      if (admin.role === 'institution_admin') {
        if (!admin.institution) {
          return res.status(403).json({
            success: false,
            message: 'No institution linked to this admin account.',
          });
        }
        institutionInfo = await Institution.findById(admin.institution);
        if (!institutionInfo) {
          return res.status(403).json({ success: false, message: 'Associated institution not found.' });
        }
        if (institutionInfo.status !== 'Approved') {
          return res.status(403).json({
            success: false,
            message: `Your institution is currently ${institutionInfo.status}. Access is restricted until approval.`,
          });
        }
      }

      // Privileged Account MFA Challenge
      if (admin.mfa_enabled) {
        const rawMfaOtp = crypto.randomInt(100000, 999999).toString();
        admin.mfa_otp = hashToken(rawMfaOtp);
        admin.mfa_otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        admin.mfa_otp_attempts = 0;
        await admin.save();

        await sendVerificationEmail({
          to: admin.email,
          name: admin.full_name || 'Admin',
          token: crypto.randomBytes(32).toString('hex'),
          otp: rawMfaOtp,
        });

        const secret = getValidatedJwtSecret();
        const mfaChallengeToken = jwt.sign(
          { id: admin._id, role: admin.role, mfa_pending: true },
          secret,
          { expiresIn: '10m' }
        );

        return res.status(200).json({
          success: true,
          mfa_required: true,
          mfa_token: mfaChallengeToken,
          message: 'Two-factor authentication code sent to your registered email.',
        });
      }

      await recordSuccessfulLogin(admin);

      // Embed the actual role and institutionId in the JWT
      const token = generateToken(admin._id, admin.role, admin.institution ? { institution: admin.institution } : {});

      await SystemLog.create({
        user_id: admin._id,
        institution: admin.institution || null,
        user_type: 'admin',
        action: `${admin.role === 'super_admin' ? 'Super Admin' : 'Institution Admin'} Login`,
        description: `Admin ${admin.username || admin.email} logged in successfully`,
        ip_address: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role,
          institution: admin.institution,
          institution_name: institutionInfo?.name || null,
        },
      });
    }

    // 2. WARDEN LOGIN
    else if (cleanUserType === 'warden') {
      const warden = await Warden.findOne({ email: normalizedEmail })
        .populate('hostel')
        .select('+password +lockout_until +failed_login_attempts');

      // Check account lockout
      if (warden && warden.lockout_until && warden.lockout_until > new Date()) {
        const remainingMinutes = Math.ceil((warden.lockout_until.getTime() - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s) or reset your password.`,
        });
      }

      if (!warden || !(await warden.matchPassword(password))) {
        if (warden) {
          const isNowLocked = await recordFailedAttempt(warden);
          if (isNowLocked) {
            return res.status(423).json({
              success: false,
              message: 'Account is temporarily locked due to excessive failed attempts. Try again in 15 minute(s) or reset your password.',
            });
          }
        }
        return res.status(401).json({
          success: false,
          message: INVALID_CREDENTIALS_MSG,
        });
      }

      if (warden.is_email_verified === false) {
        return res.status(403).json({
          success: false,
          email_unverified: true,
          email: warden.email,
          message: 'Your email address is not verified. Please verify your email before logging in.',
        });
      }

      await recordSuccessfulLogin(warden);

      const token = generateToken(warden._id, 'warden');

      await SystemLog.create({
        user_id: warden._id,
        institution: warden.institution || null,
        user_type: 'warden',
        action: 'Warden Login',
        description: `Warden ${warden.full_name} (${warden.email}) logged in successfully`,
        ip_address: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Warden login successful',
        token,
        user: {
          id: warden._id,
          full_name: warden.full_name,
          email: warden.email,
          phone: warden.phone,
          hostel: warden.hostel,
          role: 'warden',
        },
      });
    }

    // 3. STUDENT LOGIN
    else if (cleanUserType === 'student') {
      const student = await Student.findOne({ email: normalizedEmail })
        .populate('hostel room')
        .select('+password +lockout_until +failed_login_attempts');

      // Check account lockout
      if (student && student.lockout_until && student.lockout_until > new Date()) {
        const remainingMinutes = Math.ceil((student.lockout_until.getTime() - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to excessive failed attempts. Try again in ${remainingMinutes} minute(s) or reset your password.`,
        });
      }

      if (!student || !(await student.matchPassword(password))) {
        if (student) {
          const isNowLocked = await recordFailedAttempt(student);
          if (isNowLocked) {
            return res.status(423).json({
              success: false,
              message: 'Account is temporarily locked due to excessive failed attempts. Try again in 15 minute(s) or reset your password.',
            });
          }
        }
        return res.status(401).json({
          success: false,
          message: INVALID_CREDENTIALS_MSG,
        });
      }

      if (student.is_email_verified === false) {
        return res.status(403).json({
          success: false,
          email_unverified: true,
          email: student.email,
          message: 'Your email address is not verified. Please check your inbox or enter your 6-digit verification code.',
        });
      }

      if (!student.is_approved) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending approval by the Hostel Administrator.',
        });
      }

      await recordSuccessfulLogin(student);

      const token = generateToken(student._id, 'student');

      await SystemLog.create({
        user_id: student._id,
        institution: student.institution || null,
        user_type: 'student',
        action: 'Student Login',
        description: `Student ${student.full_name} (${student.roll_number}) logged in successfully`,
        ip_address: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Student login successful',
        token,
        user: {
          id: student._id,
          full_name: student.full_name,
          email: student.email,
          roll_number: student.roll_number,
          drcc_id: student.drcc_id,
          department: student.department,
          phone: student.phone,
          profile_image: student.profile_image,
          hostel: student.hostel,
          room: student.room,
          is_approved: student.is_approved,
          role: 'student',
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user type specified. Must be 'admin', 'warden', or 'student'.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Verify Admin 2FA (MFA) Code
// @route   POST /api/auth/verify-mfa
// @access  Public (Requires valid short-lived mfa_token)
export const verifyMfa = async (req, res) => {
  try {
    const { mfa_token } = req.body;
    const mfa_code = req.body.mfa_code || req.body.otp;

    if (!mfa_token || !mfa_code) {
      return res.status(400).json({
        success: false,
        message: 'MFA challenge token and 6-digit code are required.',
      });
    }

    const secret = getValidatedJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(mfa_token, secret);
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'MFA challenge token is invalid or expired. Please log in again.',
      });
    }

    if (!decoded.mfa_pending || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA token payload.',
      });
    }

    const admin = await Admin.findById(decoded.id).select('+mfa_otp +mfa_otp_expires +mfa_otp_attempts');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    if (admin.mfa_otp_attempts >= 5) {
      admin.mfa_otp = undefined;
      admin.mfa_otp_expires = undefined;
      await admin.save();
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect MFA attempts. This code has been invalidated. Please log in again.',
      });
    }

    if (!admin.mfa_otp_expires || admin.mfa_otp_expires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'MFA code has expired. Please log in again.',
      });
    }

    const hashedInput = hashToken(mfa_code.toString().trim());
    if (admin.mfa_otp !== hashedInput) {
      admin.mfa_otp_attempts = (admin.mfa_otp_attempts || 0) + 1;
      await admin.save();
      const remaining = Math.max(0, 5 - admin.mfa_otp_attempts);
      return res.status(400).json({
        success: false,
        message: `Incorrect MFA code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Clear MFA code upon successful verification
    admin.mfa_otp = undefined;
    admin.mfa_otp_expires = undefined;
    admin.mfa_otp_attempts = 0;
    await admin.save();

    let institutionInfo = null;
    if (admin.role === 'institution_admin' && admin.institution) {
      institutionInfo = await Institution.findById(admin.institution);
    }

    const token = generateToken(admin._id, admin.role, admin.institution ? { institution: admin.institution } : {});

    await SystemLog.create({
      user_id: admin._id,
      institution: admin.institution || null,
      user_type: 'admin',
      action: 'Admin 2FA Verification',
      description: `Admin ${admin.username || admin.email} verified 2FA successfully`,
      ip_address: req.ip || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication verified successfully',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        institution: admin.institution,
        institution_name: institutionInfo?.name || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during MFA verification',
      error: error.message,
    });
  }
};

// @desc    Enable or Disable 2FA for Admin Account
// @route   POST /api/auth/mfa/toggle
// @access  Private (Admin, Super Admin, Institution Admin)
export const toggleAdminMfa = async (req, res) => {
  try {
    const enable = req.body.enable !== undefined ? req.body.enable : req.body.enabled;
    const { password } = req.body;

    if (typeof enable !== 'boolean' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide enable (boolean) and your current password.',
      });
    }

    const admin = await Admin.findById(req.user._id).select('+password');
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Cannot update two-factor authentication settings.',
      });
    }

    admin.mfa_enabled = enable;
    if (!enable) {
      admin.mfa_otp = undefined;
      admin.mfa_otp_expires = undefined;
      admin.mfa_otp_attempts = 0;
    }
    await admin.save();

    return res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully.`,
      mfa_enabled: enable,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error updating MFA settings',
      error: error.message,
    });
  }
};

// @desc    Register a new Student with Brevo Email Verification
// @route   POST /api/auth/register
// @access  Public
export const registerStudent = async (req, res) => {
  try {
    const {
      full_name,
      email,
      roll_number,
      drcc_id,
      department,
      phone,
      password,
      parent_name,
      parent_phone,
      address,
      emergency_contact,
      institution_id,
    } = req.body;

    let instId = institution_id;
    if (!instId && (req.body.hostel_id || req.body.hostel)) {
      const Hostel = (await import('../models/Hostel.js')).default;
      const hostelDoc = await Hostel.findById(req.body.hostel_id || req.body.hostel);
      if (hostelDoc) {
        instId = hostelDoc.institution;
      }
    }

    if (!full_name || !email || !roll_number || !department || !phone || !password || !instId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields including institution preference or valid hostel.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanRollNumber = roll_number.trim().toUpperCase();

    // Check duplicate email scoped by institution
    const existingEmail = await Student.findOne({ email: normalizedEmail, institution: instId });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered in this institution!',
      });
    }

    // Check duplicate roll number scoped by institution
    const existingRoll = await Student.findOne({ roll_number: cleanRollNumber, institution: instId });
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is already registered in this institution!',
      });
    }

    // Check duplicate DRCC ID if provided
    if (drcc_id && drcc_id.trim()) {
      const existingDrcc = await Student.findOne({ drcc_id: drcc_id.trim(), institution: instId });
      if (existingDrcc) {
        return res.status(400).json({
          success: false,
          message: 'DRCC ID is already registered in this institution!',
        });
      }
    }

    // Profile image if uploaded
    let profile_image = '';
    if (req.file) {
      profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    // Generate secure single-use verification token & 6-digit OTP
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    const hashedToken = hashToken(rawVerificationToken);
    const hashedOtp = hashToken(rawOtp);

    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create student with is_approved: false, is_email_verified: false
    const newStudent = await Student.create({
      institution: instId,
      full_name: full_name.trim(),
      email: normalizedEmail,
      roll_number: cleanRollNumber,
      drcc_id: drcc_id ? drcc_id.trim() : undefined,
      department: department.trim(),
      phone: phone.trim(),
      password,
      profile_image,
      parent_name: parent_name ? parent_name.trim() : '',
      parent_phone: parent_phone ? parent_phone.trim() : '',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact ? emergency_contact.trim() : '',
      is_approved: false,
      is_email_verified: false,
      email_verification_token: hashedToken,
      email_verification_otp: hashedOtp,
      email_verification_expires: tokenExpires,
      email_verification_otp_expires: otpExpires,
      verification_otp_attempts: 0,
      resend_available_at: new Date(Date.now() + 60 * 1000), // 60s cooldown
      hostel: req.body.hostel_id || req.body.hostel || null,
      room: null,
    });

    // Send transactional verification email via Brevo
    await sendVerificationEmail({
      to: normalizedEmail,
      name: newStudent.full_name,
      token: rawVerificationToken,
      otp: rawOtp,
    });

    // System Log
    await SystemLog.create({
      user_id: newStudent._id,
      institution: instId,
      user_type: 'student',
      action: 'Student Self-Registration',
      description: `New student registration submitted for ${newStudent.full_name} (${newStudent.roll_number})`,
      ip_address: req.ip || req.connection?.remoteAddress || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! A verification email with a single-use link and 6-digit OTP has been sent. Please verify your email before logging in.',
      student_id: newStudent._id,
      email: normalizedEmail,
      verification_required: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

// @desc    Verify email address using secure link token or 6-digit OTP
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token, otp, email } = req.body;

    if (!token && !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a verification link token or a 6-digit OTP code.',
      });
    }

    // Case 1: Verification via single-use link token
    if (token && typeof token === 'string') {
      const hashedToken = hashToken(token);

      let user = await Student.findOne({ email_verification_token: hashedToken }).select(
        '+email_verification_token +email_verification_expires'
      );
      let userRole = 'student';

      if (!user) {
        user = await Admin.findOne({ email_verification_token: hashedToken }).select(
          '+email_verification_token +email_verification_expires'
        );
        userRole = 'admin';
      }

      if (!user) {
        user = await Warden.findOne({ email_verification_token: hashedToken }).select(
          '+email_verification_token +email_verification_expires'
        );
        userRole = 'warden';
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already consumed verification link.',
        });
      }

      if (user.email_verification_expires && user.email_verification_expires < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'This verification link has expired. Please request a new verification code.',
        });
      }

      // Mark verified and invalidate token/OTP
      user.is_email_verified = true;
      user.email_verification_token = undefined;
      user.email_verification_otp = undefined;
      user.email_verification_expires = undefined;
      user.email_verification_otp_expires = undefined;
      user.verification_otp_attempts = 0;
      await user.save();

      await SystemLog.create({
        user_id: user._id,
        institution: user.institution || null,
        user_type: userRole,
        action: 'Email Verification',
        description: `Email verified successfully via single-use link for ${user.email}`,
        ip_address: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! You may now log in.',
      });
    }

    // Case 2: Verification via 6-digit OTP code
    if (otp) {
      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Email is required when verifying via 6-digit OTP code.',
        });
      }

      const cleanOtp = String(otp).trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP format. Please enter a valid 6-digit numeric code.',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user = await Student.findOne({ email: normalizedEmail }).select(
        '+email_verification_otp +email_verification_otp_expires +email_verification_expires +verification_otp_attempts'
      );
      let userRole = 'student';

      if (!user) {
        user = await Admin.findOne({ email: normalizedEmail }).select(
          '+email_verification_otp +email_verification_otp_expires +email_verification_expires +verification_otp_attempts'
        );
        userRole = 'admin';
      }

      if (!user) {
        user = await Warden.findOne({ email: normalizedEmail }).select(
          '+email_verification_otp +email_verification_otp_expires +email_verification_expires +verification_otp_attempts'
        );
        userRole = 'warden';
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code or email.',
        });
      }

      if (user.is_email_verified) {
        return res.status(200).json({
          success: true,
          message: 'Email is already verified. You may proceed to log in.',
        });
      }

      // Check brute-force attempts limit
      if (user.verification_otp_attempts >= 5) {
        user.email_verification_otp = undefined;
        user.email_verification_token = undefined;
        user.email_verification_otp_expires = undefined;
        user.email_verification_expires = undefined;
        await user.save();

        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. This code has been invalidated. Please request a new verification code.',
        });
      }

      // Check expiration
      const otpExpiry = user.email_verification_otp_expires || user.email_verification_expires;
      if (!otpExpiry || otpExpiry < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'This verification code has expired. Please request a new one.',
        });
      }

      // Validate OTP hash
      const hashedInputOtp = hashToken(cleanOtp);
      if (user.email_verification_otp !== hashedInputOtp) {
        user.verification_otp_attempts = (user.verification_otp_attempts || 0) + 1;
        if (user.verification_otp_attempts >= 5) {
          user.email_verification_otp = undefined;
          user.email_verification_token = undefined;
        }
        await user.save();

        const remaining = Math.max(0, 5 - user.verification_otp_attempts);
        return res.status(400).json({
          success: false,
          message: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`,
        });
      }

      // Correct OTP
      user.is_email_verified = true;
      user.email_verification_token = undefined;
      user.email_verification_otp = undefined;
      user.email_verification_expires = undefined;
      user.email_verification_otp_expires = undefined;
      user.verification_otp_attempts = 0;
      await user.save();

      await SystemLog.create({
        user_id: user._id,
        institution: user.institution || null,
        user_type: userRole,
        action: 'Email Verification',
        description: `Email verified successfully via 6-digit OTP for ${user.email}`,
        ip_address: req.ip || req.connection?.remoteAddress || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! You may now log in.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during email verification',
      error: error.message,
    });
  }
};

// @desc    Resend verification email (rate-limited cooldown)
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await Student.findOne({ email: normalizedEmail }).select(
      '+resend_available_at +email_verification_token +email_verification_otp'
    );
    if (!user) user = await Admin.findOne({ email: normalizedEmail }).select('+resend_available_at');
    if (!user) user = await Warden.findOne({ email: normalizedEmail }).select('+resend_available_at');

    const genericResponse = {
      success: true,
      message: 'If an account exists with this email address, a new verification email has been sent.',
    };

    if (!user || user.is_email_verified) {
      return res.status(200).json(genericResponse);
    }

    // Cooldown check (60 seconds)
    if (user.resend_available_at && user.resend_available_at > new Date()) {
      const waitSeconds = Math.ceil((user.resend_available_at.getTime() - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification email.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    // Generate fresh tokens
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    user.email_verification_token = hashToken(rawVerificationToken);
    user.email_verification_otp = hashToken(rawOtp);
    user.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.email_verification_otp_expires = new Date(Date.now() + 15 * 60 * 1000);
    user.verification_otp_attempts = 0;
    user.resend_available_at = new Date(Date.now() + 60 * 1000);
    await user.save();

    await sendVerificationEmail({
      to: normalizedEmail,
      name: user.full_name || 'User',
      token: rawVerificationToken,
      otp: rawOtp,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while resending verification',
      error: error.message,
    });
  }
};

// @desc    Initiate forgot-password request
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const genericSuccess = {
      success: true,
      message: 'If an account is associated with this email, password reset instructions have been sent.',
    };

    let user = await Student.findOne({ email: normalizedEmail });
    if (!user) user = await Admin.findOne({ email: normalizedEmail });
    if (!user) user = await Warden.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json(genericSuccess);
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.reset_password_token = hashToken(rawResetToken);
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.full_name || 'User',
      token: rawResetToken,
    });

    return res.status(200).json(genericSuccess);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset request',
      error: error.message,
    });
  }
};

// @desc    Complete password reset with single-use token & session invalidation
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.body;
    const new_password = req.body.new_password || req.body.newPassword;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing password reset token.',
      });
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters in length.',
      });
    }

    const hashedToken = hashToken(token);

    let user = await Student.findOne({ reset_password_token: hashedToken }).select(
      '+reset_password_token +reset_password_expires'
    );
    if (!user) {
      user = await Admin.findOne({ reset_password_token: hashedToken }).select(
        '+reset_password_token +reset_password_expires'
      );
    }
    if (!user) {
      user = await Warden.findOne({ reset_password_token: hashedToken }).select(
        '+reset_password_token +reset_password_expires'
      );
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link.',
      });
    }

    if (user.reset_password_expires && user.reset_password_expires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link has expired. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash)
    user.password = new_password;
    user.password_changed_at = new Date(); // Invalidates prior JWT tokens
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    await SystemLog.create({
      user_id: user._id,
      institution: user.institution || null,
      user_type: user.role || 'user',
      action: 'Password Reset',
      description: `Password reset successfully completed for ${user.email}`,
      ip_address: req.ip || req.connection?.remoteAddress || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You may now log in.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: error.message,
    });
  }
};

// @desc    Official Google OAuth Sign-In & Safe Account Linking
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential, institution_id } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google identity credential (ID token) is required.',
      });
    }

    let payload;

    // Test environment mock support
    if (credential.startsWith('mock_google_id_token:') && (process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production')) {
      const parts = credential.split(':');
      payload = {
        sub: parts[1] || 'google_sub_12345',
        email: parts[2] || 'test_google@campushome.app',
        email_verified: parts[3] === 'verified',
        name: parts[4] || 'Google Test Student',
        aud: process.env.GOOGLE_CLIENT_ID || 'test_google_client_id',
      };
    } else {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        return res.status(500).json({
          success: false,
          message: 'GOOGLE_CLIENT_ID is not configured on the server.',
        });
      }

      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });

      payload = ticket.getPayload();
    }

    if (!payload || !payload.email || !payload.sub) {
      return res.status(400).json({
        success: false,
        message: 'Failed to extract valid identity claims from Google credential.',
      });
    }

    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Your Google email address is unverified. Please verify your email with Google first.',
      });
    }

    const googleSub = payload.sub;
    const googleEmail = payload.email.toLowerCase().trim();
    const fullName = payload.name || 'Google User';

    // 1. Search by existing linked google_id
    let student = await Student.findOne({ google_id: googleSub }).populate('hostel room');
    if (student) {
      if (!student.is_approved) {
        return res.status(403).json({
          success: false,
          message: 'Your student account is pending approval by the Hostel Administrator.',
        });
      }

      const token = generateToken(student._id, 'student');
      return res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        token,
        user: {
          id: student._id,
          full_name: student.full_name,
          email: student.email,
          roll_number: student.roll_number,
          department: student.department,
          phone: student.phone,
          hostel: student.hostel,
          room: student.room,
          is_approved: student.is_approved,
          role: 'student',
        },
      });
    }

    // 2. Search existing student by verified email & safely link Google sub
    student = await Student.findOne({ email: googleEmail }).populate('hostel room');
    if (student) {
      student.google_id = googleSub;
      student.is_email_verified = true;
      await student.save();

      if (!student.is_approved) {
        return res.status(403).json({
          success: false,
          message: 'Your student account is pending approval by the Hostel Administrator.',
        });
      }

      const token = generateToken(student._id, 'student');
      return res.status(200).json({
        success: true,
        message: 'Google account linked and authenticated successfully',
        token,
        user: {
          id: student._id,
          full_name: student.full_name,
          email: student.email,
          roll_number: student.roll_number,
          department: student.department,
          phone: student.phone,
          hostel: student.hostel,
          room: student.room,
          is_approved: student.is_approved,
          role: 'student',
        },
      });
    }

    // 3. Check existing Admin by email / google_id (safe link without privilege escalation)
    let admin = await Admin.findOne({ $or: [{ google_id: googleSub }, { email: googleEmail }] });
    if (admin) {
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Your admin account has been deactivated.',
        });
      }

      admin.google_id = googleSub;
      admin.is_email_verified = true;
      await admin.save();

      let instInfo = null;
      if (admin.role === 'institution_admin' && admin.institution) {
        instInfo = await Institution.findById(admin.institution);
        if (!instInfo || instInfo.status !== 'Approved') {
          return res.status(403).json({
            success: false,
            message: 'Your institution is not approved.',
          });
        }
      }

      const token = generateToken(admin._id, admin.role, admin.institution ? { institution: admin.institution } : {});
      return res.status(200).json({
        success: true,
        message: 'Admin Google login successful',
        token,
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role,
          institution: admin.institution,
          institution_name: instInfo?.name || null,
        },
      });
    }

    // 4. User does not exist — STRICT RULE: Google Sign-In must NOT grant Admin permissions automatically!
    if (institution_id) {
      const targetInst = await Institution.findById(institution_id);
      if (!targetInst || targetInst.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Selected institution is invalid or not yet approved.',
        });
      }

      const randomPassword = crypto.randomBytes(24).toString('hex');
      const studentRollNumber = `G-${googleSub.slice(-6).toUpperCase()}`;

      const newGoogleStudent = await Student.create({
        institution: targetInst._id,
        full_name: fullName,
        email: googleEmail,
        roll_number: studentRollNumber,
        department: 'General Admission',
        phone: 'Pending Phone Update',
        password: randomPassword,
        google_id: googleSub,
        is_email_verified: true,
        is_approved: false,
      });

      return res.status(201).json({
        success: true,
        pending_approval: true,
        message: 'Your student account has been created via Google Sign-In. It is currently pending approval by your institution administrator.',
        student_id: newGoogleStudent._id,
      });
    }

    return res.status(404).json({
      success: false,
      not_registered: true,
      email: googleEmail,
      name: fullName,
      message: 'No account registered with this Google email. Please sign up or select your institution.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during Google authentication',
      error: error.message,
    });
  }
};

// @desc    Get Current Logged-in User Profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    let userData = req.user.toObject ? req.user.toObject() : { ...req.user };
    userData.role = req.userRole || userData.role;
    if (userData.institution && !userData.institution_name) {
      const inst = await Institution.findById(userData.institution).select('name code status');
      if (inst) {
        userData.institution_name = inst.name;
        userData.institution_code = inst.code;
        userData.institution_status = inst.status;
      }
    }
    return res.status(200).json({
      success: true,
      user: userData,
      role: req.userRole || userData.role,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
};
