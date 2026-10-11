import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5050/api';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: BREVO EMAIL VERIFICATION & GOOGLE AUTH');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campushome');

  const Student = (await import('./models/Student.js')).default;
  const Institution = (await import('./models/Institution.js')).default;
  const Admin = (await import('./models/Admin.js')).default;

  // 1. Get an existing approved institution for testing
  let inst = await Institution.findOne({ status: 'Approved' });
  if (!inst) {
    inst = await Institution.create({
      name: 'Test Tech University',
      code: 'TTU-' + Date.now().toString().slice(-4),
      status: 'Approved',
      address: '100 University Ave',
      contact_email: 'admin@ttu.edu',
      contact_phone: '1234567890',
    });
  }

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `student_${uniqueSuffix}@campus.test`;
  const testPassword = 'Password@123';

  // TEST 1: Registration creates unverified user and triggers Brevo verification
  console.log('--- TEST 1: Student Registration & Email Verification Trigger ---');
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Test Verification Student',
      email: testEmail,
      roll_number: `ROLL-${uniqueSuffix}`,
      department: 'Computer Science & Engineering',
      phone: '9876543210',
      password: testPassword,
      institution_id: inst._id.toString(),
    }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.success === true, 'Student registration succeeds with 201');
  assert(regData.verification_required === true, 'Response indicates email verification is required');

  // Verify DB state
  const dbStudent = await Student.findOne({ email: testEmail }).select(
    '+email_verification_token +email_verification_otp +email_verification_expires +email_verification_otp_expires'
  );
  assert(dbStudent !== null, 'Student record exists in MongoDB');
  assert(dbStudent.is_email_verified === false, 'Student is marked as unverified (is_email_verified: false)');
  assert(Boolean(dbStudent.email_verification_token), 'Secure verification token hash is stored');
  assert(Boolean(dbStudent.email_verification_otp), 'Secure 6-digit OTP hash is stored');
  assert(dbStudent.email_verification_token.length === 64, 'Token is stored as 64-character SHA-256 hash');
  assert(dbStudent.email_verification_otp.length === 64, 'OTP is stored as 64-character SHA-256 hash');

  // TEST 2: Unverified user is blocked from logging in
  console.log('\n--- TEST 2: Block Login for Unverified Account ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      user_type: 'student',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 403, 'Login is blocked with HTTP 403');
  assert(loginData.email_unverified === true, 'Response flags email_unverified: true');

  // TEST 3: Resend verification email rate-limiting and cooldown
  console.log('\n--- TEST 3: Resend Verification Cooldown ---');
  const resendRes1 = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const resendData1 = await resendRes1.json();
  assert(resendRes1.status === 429, 'Immediate resend is rate-limited (HTTP 429 cooldown active)');

  // TEST 4: Invalid OTP attempt rejection and attempt count increment
  console.log('\n--- TEST 4: Invalid OTP Verification & Attempt Limiting ---');
  const badOtpRes = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '000000' }),
  });
  const badOtpData = await badOtpRes.json();
  assert(badOtpRes.status === 400 && badOtpData.success === false, 'Invalid OTP is rejected with 400');

  // Check attempt increment in DB
  const studentAfterBadOtp = await Student.findOne({ email: testEmail }).select('+verification_otp_attempts');
  assert(studentAfterBadOtp.verification_otp_attempts === 1, 'OTP attempt counter incremented to 1');

  // TEST 5: Successful verification via 6-digit OTP
  console.log('\n--- TEST 5: Verify via Known 6-Digit OTP ---');
  // Inject a known test OTP hash
  const testOtp = '849201';
  const hashedOtp = crypto.createHash('sha256').update(testOtp).digest('hex');
  await Student.updateOne(
    { _id: dbStudent._id },
    {
      $set: {
        email_verification_otp: hashedOtp,
        email_verification_otp_expires: new Date(Date.now() + 15 * 60 * 1000),
        verification_otp_attempts: 0,
      },
    }
  );

  const goodOtpRes = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: testOtp }),
  });
  const goodOtpData = await goodOtpRes.json();
  assert(goodOtpRes.status === 200 && goodOtpData.success === true, 'Correct OTP verifies email with HTTP 200');

  const studentAfterGoodOtp = await Student.findOne({ email: testEmail }).select(
    '+email_verification_token +email_verification_otp'
  );
  assert(studentAfterGoodOtp.is_email_verified === true, 'Student is now marked as is_email_verified: true');
  assert(!studentAfterGoodOtp.email_verification_otp, 'OTP is invalidated and cleared from database');
  assert(!studentAfterGoodOtp.email_verification_token, 'Verification token is cleared from database');

  // TEST 6: Single-use verification link
  console.log('\n--- TEST 6: Single-Use Verification Link ---');
  const testEmail2 = `link_${uniqueSuffix}@campus.test`;
  const rawLinkToken = crypto.randomBytes(32).toString('hex');
  const hashedLinkToken = crypto.createHash('sha256').update(rawLinkToken).digest('hex');

  const student2 = await Student.create({
    institution: inst._id,
    full_name: 'Link Verification Student',
    email: testEmail2,
    roll_number: `LINK-${uniqueSuffix}`,
    department: 'Computer Science & Engineering',
    phone: '9876543211',
    password: testPassword,
    is_email_verified: false,
    email_verification_token: hashedLinkToken,
    email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const linkRes1 = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawLinkToken }),
  });
  const linkData1 = await linkRes1.json();
  assert(linkRes1.status === 200 && linkData1.success === true, 'Verification via single-use link succeeds');

  const linkRes2 = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawLinkToken }),
  });
  assert(linkRes2.status === 400, 'Reusing consumed verification link is rejected (single-use enforced)');

  // TEST 7: Forgot password and Reset Password flow
  console.log('\n--- TEST 7: Forgot Password & Reset Password Flow ---');
  const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const forgotData = await forgotRes.json();
  assert(forgotRes.status === 200 && forgotData.success === true, 'Forgot password request succeeds');

  // Verify reset token was set in DB
  const studentWithReset = await Student.findOne({ email: testEmail }).select(
    '+reset_password_token +reset_password_expires'
  );
  assert(Boolean(studentWithReset.reset_password_token), 'Reset password token hash is saved in DB');
  assert(studentWithReset.reset_password_expires > new Date(), 'Reset password expiry is valid in the future');

  // Inject a known test reset token
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
  await Student.updateOne(
    { _id: studentWithReset._id },
    {
      $set: {
        reset_password_token: hashedResetToken,
        reset_password_expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    }
  );

  const newPassword = 'NewSecretPassword@456';
  const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawResetToken, new_password: newPassword }),
  });
  const resetData = await resetRes.json();
  assert(resetRes.status === 200 && resetData.success === true, 'Password reset succeeds with valid token');

  // Verify old token is consumed
  const resetResReuse = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawResetToken, new_password: 'AnotherPassword@789' }),
  });
  assert(resetResReuse.status === 400, 'Reused password reset token is rejected');

  // TEST 8: Google Sign-In with Mock ID Token
  console.log('\n--- TEST 8: Google Sign-In & Safe Account Linking ---');
  // Submitting missing credential
  const googleFailRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(googleFailRes.status === 400, 'Missing Google credential returns 400');

  // Submitting unverified Google credential
  const googleUnverifiedRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'mock_google_id_token:sub_unverified:unverified@test.com:unverified:Unverified User' }),
  });
  assert(googleUnverifiedRes.status === 400, 'Unverified Google email claim is rejected');

  // Safe linking to existing approved student
  const approvedGoogleStudent = await Student.create({
    institution: inst._id,
    full_name: 'Approved Google Student',
    email: `google_${uniqueSuffix}@campus.test`,
    roll_number: `G-${uniqueSuffix}`,
    department: 'Computer Science & Engineering',
    phone: '9876543212',
    password: testPassword,
    is_approved: true,
    is_email_verified: false,
  });

  const googleGoodRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: `mock_google_id_token:sub_${uniqueSuffix}:${approvedGoogleStudent.email}:verified:Approved Google Student`,
    }),
  });
  const googleGoodData = await googleGoodRes.json();
  assert(googleGoodRes.status === 200 && googleGoodData.success === true, 'Google auth links student and returns JWT');
  assert(Boolean(googleGoodData.token), 'Valid application JWT issued');
  assert(googleGoodData.user.role === 'student', 'Issued token preserves student role without elevation');

  const studentAfterGoogle = await Student.findById(approvedGoogleStudent._id);
  assert(studentAfterGoogle.google_id === `sub_${uniqueSuffix}`, 'Google sub ID linked to student account');
  assert(studentAfterGoogle.is_email_verified === true, 'Email marked verified via Google claim');

  // Zero privilege escalation test: Google login NEVER grants Admin access
  const randomGoogleRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: `mock_google_id_token:sub_attacker_${uniqueSuffix}:attacker@random.com:verified:Attacker`,
    }),
  });
  const randomGoogleData = await randomGoogleRes.json();
  assert(randomGoogleRes.status === 404, 'Unregistered Google user without institution is rejected (no auto-admin)');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
