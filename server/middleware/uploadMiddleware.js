import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from 'crypto';

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '../uploads');
const profileDir = path.join(uploadBaseDir, 'profiles');
const docsDir = path.join(uploadBaseDir, 'documents');
const complaintsDir = path.join(uploadBaseDir, 'complaints');

[uploadBaseDir, profileDir, docsDir, complaintsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage engine: Safe server-side randomized filenames preventing path traversal
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'profile_image') {
      cb(null, profileDir);
    } else if (file.fieldname === 'leave_doc' || file.fieldname === 'document') {
      cb(null, docsDir);
    } else if (file.fieldname === 'complaint_image') {
      cb(null, complaintsDir);
    } else {
      cb(null, uploadBaseDir);
    }
  },
  filename: function (req, file, cb) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${file.fieldname}-${Date.now()}-${randomHex}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
]);

// File filter: Validate both declared MIME type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX`), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

/**
 * Validates file signature (magic bytes) to prevent spoofed extensions/content.
 */
export const verifyMagicBytes = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  const buffer = Buffer.alloc(16);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
      return true;
    // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      bytesRead >= 12 &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    )
      return true;
    // PDF: %PDF (25 50 44 46)
    if (buffer.toString('ascii', 0, 4) === '%PDF') return true;
    // DOC / Compound File: D0 CF 11 E0
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) return true;
    // DOCX / ZIP: 50 4B 03 04
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05)) return true;

    return false;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};

/**
 * Middleware to enforce magic bytes inspection post-multer.
 */
export const validateUploadedFile = (req, res, next) => {
  if (!req.file) return next();
  try {
    const isValid = verifyMagicBytes(req.file.path);
    if (!isValid) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid file content: file signature does not match allowed types.',
      });
    }
    next();
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: 'Failed to verify uploaded file.',
    });
  }
};
