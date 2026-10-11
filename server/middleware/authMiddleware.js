import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Warden from '../models/Warden.js';
import Student from '../models/Student.js';

// Validate and return environment JWT Secret (min 32 characters, no hardcoded fallbacks)
export const getValidatedJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be defined in environment variables and be at least 32 characters long.');
  }
  return secret.trim();
};

// Generate JWT Token
export const generateToken = (id, role, extra = {}) => {
  const secret = getValidatedJwtSecret();
  return jwt.sign(
    { id, role, ...extra },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Protect Routes (Verify JWT Token & populate req.user)
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const secret = getValidatedJwtSecret();
    const decoded = jwt.verify(token, secret);

    let user = null;
    if (decoded.role === 'super_admin' || decoded.role === 'institution_admin' || decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
      if (user && user.role) {
        decoded.role = user.role; // override with precise admin role
      }
    } else if (decoded.role === 'warden') {
      user = await Warden.findById(decoded.id).populate('hostel').select('-password');
    } else if (decoded.role === 'student') {
      user = await Student.findById(decoded.id).populate('hostel room').select('-password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    req.user = user;
    req.userRole = decoded.role;
    req.institutionId = user.institution || null;
    
    // Check if the user is active (if applicable)
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated' });
    }

    // Check institution status for non-super_admins
    if (req.userRole !== 'super_admin' && req.institutionId) {
      const Institution = (await import('../models/Institution.js')).default;
      const institution = await Institution.findById(req.institutionId);
      if (!institution) {
        return res.status(401).json({ success: false, message: 'Associated institution not found' });
      }
      if (institution.status !== 'Approved') {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Your institution account is currently: ${institution.status}.` 
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed or expired',
      error: error.message,
    });
  }
};

// Role-based Authorization Middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.userRole}' is forbidden from accessing this resource`,
      });
    }
    next();
  };
};

// Tenant Isolation Middleware - Ensures operations are scoped to the user's institution
export const authorizeInstitution = (req, res, next) => {
  // Super admins are not strictly bound to one institution (they manage all)
  if (req.userRole === 'super_admin') {
    return next();
  }
  
  if (!req.institutionId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You are not associated with any institution',
    });
  }

  // Inject institution into the request body/query if not present, or enforce it
  // For queries
  req.query.institution = req.institutionId;
  // For creation (body) - ensure users can't create resources for other institutions
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (req.body.institution && req.body.institution !== String(req.institutionId)) {
      return res.status(403).json({
        success: false,
        message: 'Strict Tenant Isolation: Cannot modify data for another institution',
      });
    }
    req.body.institution = req.institutionId;
  }
  
  next();
};
