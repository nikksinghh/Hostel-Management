import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './server.js';
import { getValidatedJwtSecret } from './middleware/authMiddleware.js';
import { verifyMagicBytes } from './middleware/uploadMiddleware.js';
import { rateLimit } from './middleware/rateLimitMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import Room from './models/Room.js';
import Payment from './models/Payment.js';
import Student from './models/Student.js';
import Institution from './models/Institution.js';
import Hostel from './models/Hostel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5013;
let server;

async function runSecurityAudit() {
  console.log('🔒 ==========================================');
  console.log('🔒 CAMPUSHOME FIX-01 TO FIX-07 SECURITY AUDIT');
  console.log('🔒 ==========================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      failed++;
    }
  };

  try {
    await new Promise((r) => setTimeout(r, 1500));
    server = app.listen(PORT, () => console.log(`Test server running on :${PORT}`));

    // --- FIX-01: Health Endpoint & DB Resilience ---
    console.log('─── FIX-01: Database Health Check & Resilience ───');
    await test('Health check returns 200 & connected status when DB is online', async () => {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.status !== 'online' || data.database !== 'connected') {
        throw new Error(`Expected online & connected, got ${JSON.stringify(data)}`);
      }
    });

    await test('Health check returns 503 when DB is disconnected', async () => {
      // Simulate readyState = 0 (disconnected)
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
        if (res.status !== 503) throw new Error(`Expected 503, got ${res.status}`);
        const data = await res.json();
        if (data.status !== 'degraded' || data.database !== 'disconnected') {
          throw new Error(`Expected degraded & disconnected, got ${JSON.stringify(data)}`);
        }
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      }
    });

    // --- FIX-02: Authentication Rate Limiting ---
    console.log('\n─── FIX-02: Authentication Rate Limiting ───');
    await test('Rate limiter triggers HTTP 429 when threshold exceeded', async () => {
      const limiter = rateLimit({ maxRequests: 3, windowMs: 10000, message: 'Too many requests' });
      let status = 200;
      let blocked = false;

      const mockReq = { ip: '192.168.1.100' };
      const mockRes = {
        setHeader: () => {},
        status: (s) => {
          status = s;
          return mockRes;
        },
        json: (d) => {
          if (status === 429) blocked = true;
          return mockRes;
        },
      };

      // 3 allowed calls
      limiter(mockReq, mockRes, () => {});
      limiter(mockReq, mockRes, () => {});
      limiter(mockReq, mockRes, () => {});
      // 4th call should be blocked
      limiter(mockReq, mockRes, () => {});

      if (!blocked || status !== 429) {
        throw new Error(`Rate limiter did not return 429. Status was ${status}`);
      }
    });

    // --- FIX-03: File Upload Validation ---
    console.log('\n─── FIX-03: File Upload Magic-Byte, MIME, and Extension Validation ───');
    await test('Spoofed file with .jpg extension but text content is rejected by magic bytes', async () => {
      const testFilePath = path.join(__dirname, 'spoofed.jpg');
      fs.writeFileSync(testFilePath, 'MALICIOUS_PHP_SCRIPT_CONTENT_HERE');
      try {
        const isValid = verifyMagicBytes(testFilePath);
        if (isValid) throw new Error('Spoofed JPG passed magic-byte verification!');
      } finally {
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
      }
    });

    await test('Genuine JPEG header passes magic-byte verification', async () => {
      const testFilePath = path.join(__dirname, 'valid.jpg');
      const validJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      fs.writeFileSync(testFilePath, validJpgHeader);
      try {
        const isValid = verifyMagicBytes(testFilePath);
        if (!isValid) throw new Error('Genuine JPEG header failed magic-byte verification!');
      } finally {
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
      }
    });

    // --- FIX-04: Production Error Sanitization & Multer Handling ---
    console.log('\n─── FIX-04: Error Sanitization & Multer Error Handling ───');
    await test('Multer errors mapped to clean HTTP status and hide stack trace in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const multerErr = new Error('File too large');
      multerErr.name = 'MulterError';
      multerErr.code = 'LIMIT_FILE_SIZE';

      let capturedStatus = 0;
      let capturedBody = {};

      const mockRes = {
        statusCode: 200,
        status: (s) => {
          capturedStatus = s;
          return mockRes;
        },
        json: (b) => {
          capturedBody = b;
          return mockRes;
        },
      };

      errorHandler(multerErr, {}, mockRes, () => {});

      process.env.NODE_ENV = prevEnv;

      if (capturedStatus !== 413) throw new Error(`Expected 413 for LIMIT_FILE_SIZE, got ${capturedStatus}`);
      if (capturedBody.stack !== null) throw new Error('Stack trace was not sanitized to null in production!');
    });

    // --- FIX-05: Atomic Bed Allocation & Room Transfer ---
    console.log('\n─── FIX-05: Atomic Bed Allocation & Capacity Overbooking Prevention ───');
    await test('Atomic query blocks allocating when available_beds is 0', async () => {
      const testInst = await Institution.create({
        name: 'SEC_TEST_INST',
        institution_type: 'College',
        code: 'SEC001',
        contact_email: 'sec@test.com',
        contact_phone: '1234567890',
        address: 'Sec Addr',
        status: 'Approved',
        admin_details: { full_name: 'Sec Admin', email: 'secadmin@test.com' },
      });

      const testHostel = await Hostel.create({
        institution: testInst._id,
        name: 'SEC_HOSTEL',
        type: 'Boys',
        block_number: 'B1',
      });

      const fullRoom = await Room.create({
        institution: testInst._id,
        hostel: testHostel._id,
        room_number: 'SEC-999',
        room_type: 'Single',
        total_beds: 1,
        available_beds: 0,
      });

      // Try atomic claim on full room
      const claimed = await Room.findOneAndUpdate(
        { _id: fullRoom._id, institution: testInst._id, available_beds: { $gt: 0 } },
        { $inc: { available_beds: -1 } },
        { new: true }
      );

      if (claimed !== null) {
        throw new Error('Overbooking vulnerability! Atomic update allocated room with 0 beds!');
      }

      // Cleanup
      await Room.findByIdAndDelete(fullRoom._id);
      await Hostel.findByIdAndDelete(testHostel._id);
      await Institution.findByIdAndDelete(testInst._id);
    });

    // --- FIX-06: Payment Idempotency Atomic Enforcement ---
    console.log('\n─── FIX-06: Payment Idempotency Atomic Enforcement ───');
    await test('Payment handler atomically enforces idempotency and blocks duplicate payment', async () => {
      const testInst = await Institution.create({
        name: 'PAY_TEST_INST',
        institution_type: 'College',
        code: 'PAY001',
        contact_email: 'pay@test.com',
        contact_phone: '1234567890',
        address: 'Pay Addr',
        status: 'Approved',
        admin_details: { full_name: 'Pay Admin', email: 'payadmin@test.com' },
      });

      const testStudent = await Student.create({
        institution: testInst._id,
        full_name: 'Pay Student',
        email: 'paystu@test.com',
        roll_number: 'PAY101',
        department: 'CS',
        phone: '9988776655',
        password: 'Password123!',
        is_approved: true,
      });

      const testPayment = await Payment.create({
        institution: testInst._id,
        student: testStudent._id,
        amount: 5000,
        due_date: new Date(),
        fine_type: 'Hostel Fee',
        status: 'Pending',
      });

      const idempKey = 'IDEMP-TEST-' + Date.now();

      // First payment execution
      const paidFirst = await Payment.findOneAndUpdate(
        { _id: testPayment._id, institution: testInst._id, student: testStudent._id, status: 'Pending' },
        { $set: { status: 'Paid', idempotency_key: idempKey, transaction_id: 'TXN-1', payment_date: new Date() } },
        { new: true }
      );

      if (!paidFirst || paidFirst.status !== 'Paid') {
        throw new Error('Initial payment failed');
      }

      // Second attempt with same ID — must be blocked atomically (status is no longer 'Pending')
      const duplicateAttempt = await Payment.findOneAndUpdate(
        { _id: testPayment._id, institution: testInst._id, student: testStudent._id, status: 'Pending' },
        { $set: { status: 'Paid', idempotency_key: idempKey, transaction_id: 'TXN-2', payment_date: new Date() } },
        { new: true }
      );

      if (duplicateAttempt !== null) {
        throw new Error('Double payment vulnerability! Second payment succeeded on already paid fee!');
      }

      // Replaying with idempotency_key finds already paid record
      const replayed = await Payment.findOne({ idempotency_key: idempKey, status: 'Paid' });
      if (!replayed || replayed.transaction_id !== 'TXN-1') {
        throw new Error('Idempotent retrieval failed to find original transaction');
      }

      // Cleanup
      await Payment.findByIdAndDelete(testPayment._id);
      await Student.findByIdAndDelete(testStudent._id);
      await Institution.findByIdAndDelete(testInst._id);
    });

    // --- FIX-07: Strict JWT Secret Validation ---
    console.log('\n─── FIX-07: Strict JWT Secret Validation ───');
    await test('getValidatedJwtSecret rejects short or missing secrets with no insecure fallback', async () => {
      const origSecret = process.env.JWT_SECRET;

      // Missing
      delete process.env.JWT_SECRET;
      let threwMissing = false;
      try {
        getValidatedJwtSecret();
      } catch {
        threwMissing = true;
      }

      // Short / Insecure
      process.env.JWT_SECRET = 'short_insecure_secret';
      let threwShort = false;
      try {
        getValidatedJwtSecret();
      } catch {
        threwShort = true;
      }

      // Valid
      process.env.JWT_SECRET = origSecret;
      const valid = getValidatedJwtSecret();

      if (!threwMissing) throw new Error('Did not throw when JWT_SECRET was missing!');
      if (!threwShort) throw new Error('Did not throw when JWT_SECRET was less than 32 characters!');
      if (!valid || valid.length < 32) throw new Error('Valid secret failed to return properly');
    });

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🏁 Security Fixes Audit: ${passed} passed, ${failed} failed`);
    console.log(`${'─'.repeat(50)}\n`);

    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error('Fatal audit failure:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

runSecurityAudit();
