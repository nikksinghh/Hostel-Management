/**
 * CAMPUSHOME — DEEP SECURITY HARDENING TEST SUITE
 * Tests:
 * 1. NoSQL Injection sanitization ($ operator strip)
 * 2. CastError safe handling (malformed ObjectId -> 400)
 * 3. Non-enumerating authentication responses (prevents email harvesting)
 * 4. Account lockout mechanism (5 failed attempts -> 423 Locked)
 * 5. Immediate JWT revocation on password change (iat check vs password_changed_at)
 * 6. Cross-tenant notice isolation & IDOR prevention
 * 7. Cross-tenant system log isolation
 * 8. Privileged Admin MFA workflow (toggle, challenge, verification)
 */

import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';
import Admin from './models/Admin.js';
import app from './server.js';

dotenv.config();

const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let server;

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

async function runTests() {
    console.log('====================================================');
    console.log('   CAMPUSHOME DEEP SECURITY HARDENING TEST SUITE   ');
    console.log('====================================================\n');

    server = app.listen(PORT, () => console.log(`Test server running on port ${PORT}`));
    await new Promise((r) => setTimeout(r, 1000));
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campushome');

    const runId = Math.floor(Math.random() * 900000 + 100000);

    // ----------------------------------------------------
    // TEST 1: NoSQL Injection Sanitization
    // ----------------------------------------------------
    console.log('[1] Testing NoSQL Operator Injection Sanitization...');
    try {
        const res = await request('/api/auth/login', {
            method: 'POST',
            body: {
                email: { "$gt": "" },
                password: "any_password",
                user_type: "student"
            }
        });
        assert(res.status === 400 || res.status === 401, `NoSQL injection attempt safely handled with HTTP ${res.status}`);
        assert(!res.body.success, 'NoSQL operator bypass did not succeed');
    } catch (err) {
        assert(false, `NoSQL injection test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 2: CastError / Malformed ObjectId Sanitization
    // ----------------------------------------------------
    console.log('\n[2] Testing CastError (Malformed ObjectId) Safe Response...');
    try {
        const res = await request('/api/notices/invalid-object-id-12345');
        assert(res.status === 400, `Malformed ObjectId returned 400 Bad Request (got ${res.status})`);
        assert(res.body.message && res.body.message.includes('Invalid resource identifier format'), `Friendly error message returned: "${res.body.message}"`);
        assert(!res.body.stack || process.env.NODE_ENV !== 'production', 'Stack trace is not leaked in production error response');
    } catch (err) {
        assert(false, `CastError test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 3: Non-Enumerating Authentication Responses
    // ----------------------------------------------------
    console.log('\n[3] Testing Non-Enumerating Authentication Responses...');
    try {
        const nonExistentRes = await request('/api/auth/login', {
            method: 'POST',
            body: {
                email: `nonexistent_user_${runId}@campus.test`,
                password: 'WrongPassword123!',
                user_type: 'student'
            }
        });
        assert(nonExistentRes.status === 401, `Non-existent user returns 401 Unauthorized (got ${nonExistentRes.status})`);
        assert(
            nonExistentRes.body.message === 'Invalid credentials. Please check your email and password.',
            `Generic non-enumerating message returned: "${nonExistentRes.body.message}"`
        );
    } catch (err) {
        assert(false, `Non-enumeration test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // SETUP: Create two distinct institutions & users for tenant isolation testing
    // ----------------------------------------------------
    console.log('\n[Setup] Provisioning test institutions and users...');
    let instAId, tokenAdminA, studentAId, tokenStudentA;
    let instBId, tokenAdminB;

    try {
        const Institution = (await import('./models/Institution.js')).default;

        const instA = await Institution.create({
            name: `Security College A ${runId}`,
            slug: `sca-${runId}`,
            institution_type: 'College',
            code: `SCA${runId}`,
            contact_email: `contact_a_${runId}@sca.test`,
            contact_phone: '9876500001',
            address: 'Campus A Street',
            status: 'Approved',
            admin_details: {
                full_name: `Admin A ${runId}`,
                email: `admin_a_${runId}@sca.test`
            }
        });
        instAId = instA._id;

        const instB = await Institution.create({
            name: `Security College B ${runId}`,
            slug: `scb-${runId}`,
            institution_type: 'College',
            code: `SCB${runId}`,
            contact_email: `contact_b_${runId}@scb.test`,
            contact_phone: '9876500002',
            address: 'Campus B Street',
            status: 'Approved',
            admin_details: {
                full_name: `Admin B ${runId}`,
                email: `admin_b_${runId}@scb.test`
            }
        });
        instBId = instB._id;

        await Admin.create({
            username: `admin_a_${runId}`,
            email: `admin_a_${runId}@sca.test`,
            password: 'Password123!',
            full_name: `Admin A ${runId}`,
            role: 'institution_admin',
            institution: instAId,
            is_active: true,
            is_email_verified: true
        });

        await Admin.create({
            username: `admin_b_${runId}`,
            email: `admin_b_${runId}@scb.test`,
            password: 'Password123!',
            full_name: `Admin B ${runId}`,
            role: 'institution_admin',
            institution: instBId,
            is_active: true,
            is_email_verified: true
        });

        const studentA = await Student.create({
            institution: instAId,
            full_name: `Student A ${runId}`,
            email: `student_a_${runId}@sca.test`,
            password: 'Password123!',
            phone: '9876500003',
            roll_number: `ROLLA${runId}`,
            department: 'CyberSecurity',
            is_approved: true,
            is_email_verified: true
        });
        studentAId = studentA._id;

        const loginA = await request('/api/auth/login', {
            method: 'POST',
            body: { email: `admin_a_${runId}@sca.test`, password: 'Password123!', user_type: 'admin' }
        });
        tokenAdminA = loginA.body.token;

        const loginB = await request('/api/auth/login', {
            method: 'POST',
            body: { email: `admin_b_${runId}@scb.test`, password: 'Password123!', user_type: 'admin' }
        });
        tokenAdminB = loginB.body.token;

        const studLogin = await request('/api/auth/login', {
            method: 'POST',
            body: { email: `student_a_${runId}@sca.test`, password: 'Password123!', user_type: 'student' }
        });
        tokenStudentA = studLogin.body.token;

        assert(tokenAdminA && tokenAdminB && tokenStudentA, 'Provisioned test tenants and authenticated tokens');
    } catch (err) {
        console.error('Setup failed:', err);
    }

    // ----------------------------------------------------
    // TEST 4: Account Lockout Mechanism
    // ----------------------------------------------------
    console.log('\n[4] Testing Account Lockout Mechanism (5 Consecutive Failures)...');
    try {
        const targetEmail = `student_a_${runId}@sca.test`;
        let lastRes;
        for (let i = 1; i <= 5; i++) {
            lastRes = await request('/api/auth/login', {
                method: 'POST',
                body: { email: targetEmail, password: 'WrongPassword', user_type: 'student' }
            });
        }
        assert(lastRes.status === 423, `5th failed login triggers 423 Locked (got HTTP ${lastRes.status})`);
        assert(
            lastRes.body.message && lastRes.body.message.includes('locked'),
            `Account lockout warning returned: "${lastRes.body.message}"`
        );

        const sixthRes = await request('/api/auth/login', {
            method: 'POST',
            body: { email: targetEmail, password: 'Password123!', user_type: 'student' }
        });
        assert(sixthRes.status === 423, `Subsequent attempt with correct password remains locked (got HTTP ${sixthRes.status})`);
    } catch (err) {
        assert(false, `Account lockout test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 5: Immediate JWT Revocation on Password Change
    // ----------------------------------------------------
    console.log('\n[5] Testing Stateless Token Revocation on Password Reset...');
    try {
        const resetStudEmail = `stud_reset_${runId}@sca.test`;
        await Student.create({
            institution: instAId,
            full_name: `Reset Student ${runId}`,
            email: resetStudEmail,
            password: 'InitialPassword123!',
            phone: '9876500004',
            roll_number: `ROLLR${runId}`,
            department: 'CyberSecurity',
            is_approved: true,
            is_email_verified: true
        });

        const initialLogin = await request('/api/auth/login', {
            method: 'POST',
            body: { email: resetStudEmail, password: 'InitialPassword123!', user_type: 'student' }
        });
        const originalToken = initialLogin.body.token;
        assert(!!originalToken, 'Obtained original active JWT');

        const profileBefore = await request('/api/student/profile', {
            headers: { Authorization: `Bearer ${originalToken}` }
        });
        assert(profileBefore.status === 200, `Original token successfully accesses protected endpoint (status: ${profileBefore.status})`);

        const forgotRes = await request('/api/auth/forgot-password', {
            method: 'POST',
            body: { email: resetStudEmail }
        });
        assert(forgotRes.status === 200, 'Password reset OTP requested');

        // Allow 1.1s so iat is strictly before password_changed_at
        await new Promise(r => setTimeout(r, 1100));

        const crypto = await import('crypto');
        const rawToken = 'testresettoken1234567890abcdef1234567890';
        const studDoc = await Student.findOne({ email: resetStudEmail });
        studDoc.reset_password_token = crypto.createHash('sha256').update(rawToken).digest('hex');
        studDoc.reset_password_expires = new Date(Date.now() + 3600000);
        await studDoc.save();

        const resetRes = await request('/api/auth/reset-password', {
            method: 'POST',
            body: {
                token: rawToken,
                new_password: 'NewStrongPassword123!'
            }
        });
        assert(resetRes.status === 200, 'Password successfully reset');

        const profileAfter = await request('/api/student/profile', {
            headers: { Authorization: `Bearer ${originalToken}` }
        });
        assert(profileAfter.status === 401, `Old JWT is revoked immediately (HTTP ${profileAfter.status})`);
        assert(
            profileAfter.body.message && profileAfter.body.message.includes('Password was changed recently'),
            `Revocation message: "${profileAfter.body.message}"`
        );

        const newLogin = await request('/api/auth/login', {
            method: 'POST',
            body: { email: resetStudEmail, password: 'NewStrongPassword123!', user_type: 'student' }
        });
        assert(newLogin.status === 200, 'Login with new password succeeded');
        const newProf = await request('/api/student/profile', {
            headers: { Authorization: `Bearer ${newLogin.body.token}` }
        });
        assert(newProf.status === 200, 'New token accesses protected endpoint successfully');
    } catch (err) {
        assert(false, `Token revocation test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 6: Multi-Tenant Notice Isolation & Cross-Tenant IDOR Prevention
    // ----------------------------------------------------
    console.log('\n[6] Testing Notice Isolation & Cross-Tenant IDOR Prevention...');
    try {
        const noticeARes = await request('/api/notices', {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenAdminA}` },
            body: {
                title: `Confidential Notice Inst A ${runId}`,
                content: 'Sensitive institution notice content.',
                audience: 'all'
            }
        });
        const noticeAId = noticeARes.body.notice?._id;
        assert(noticeARes.status === 201 && !!noticeAId, 'Admin A created Notice in Institution A');

        const crossDeleteRes = await request(`/api/notices/${noticeAId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenAdminB}` }
        });
        assert(crossDeleteRes.status === 404 || crossDeleteRes.status === 403, `Cross-tenant notice deletion blocked with HTTP ${crossDeleteRes.status}`);

        const checkNotice = await request(`/api/notices/${noticeAId}`);
        assert(checkNotice.status === 200, 'Notice A remains intact and was not deleted by Tenant B');

        const ownDeleteRes = await request(`/api/notices/${noticeAId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenAdminA}` }
        });
        assert(ownDeleteRes.status === 200, 'Admin A successfully deleted their own notice');
    } catch (err) {
        assert(false, `Notice isolation test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 7: Cross-Tenant Audit Log Isolation
    // ----------------------------------------------------
    console.log('\n[7] Testing Multi-Tenant System Audit Log Isolation...');
    try {
        const logsARes = await request('/api/admin/logs', {
            headers: { Authorization: `Bearer ${tokenAdminA}` }
        });
        assert(logsARes.status === 200, 'Admin A fetched audit logs');

        const logsBRes = await request('/api/admin/logs', {
            headers: { Authorization: `Bearer ${tokenAdminB}` }
        });
        assert(logsBRes.status === 200, 'Admin B fetched audit logs');

        const logsB = logsBRes.body.logs || [];
        const leakedLogs = logsB.filter(l => l.institution && l.institution.toString() === instAId.toString());
        assert(leakedLogs.length === 0, 'No logs belonging to Institution A leaked to Institution B');
    } catch (err) {
        assert(false, `Audit log isolation test error: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 8: Privileged Account Multi-Factor Authentication (MFA)
    // ----------------------------------------------------
    console.log('\n[8] Testing Privileged Admin Multi-Factor Authentication (MFA)...');
    try {
        const toggleOnRes = await request('/api/auth/mfa/toggle', {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenAdminA}` },
            body: { enabled: true, password: 'Password123!' }
        });
        assert(toggleOnRes.status === 200 && toggleOnRes.body.mfa_enabled === true, 'Admin A enabled MFA');

        const mfaChallengeRes = await request('/api/auth/login', {
            method: 'POST',
            body: { email: `admin_a_${runId}@sca.test`, password: 'Password123!', user_type: 'admin' }
        });
        assert(mfaChallengeRes.status === 200, 'Login credentials accepted');
        assert(mfaChallengeRes.body.mfa_required === true, 'Response requires MFA challenge');
        assert(!!mfaChallengeRes.body.mfa_token, 'Temporary mfa_token issued for 2FA step');
        assert(!mfaChallengeRes.body.token, 'Full access token is NOT issued prior to MFA verification');

        const unauthorizedMfaRes = await request('/api/admin/stats', {
            headers: { Authorization: `Bearer ${mfaChallengeRes.body.mfa_token}` }
        });
        assert(unauthorizedMfaRes.status === 401, `Temporary mfa_token cannot access protected endpoints (got HTTP ${unauthorizedMfaRes.status})`);

        const adminDoc = await Admin.findOne({ email: `admin_a_${runId}@sca.test` }).select('+mfa_otp');
        assert(!!adminDoc && !!adminDoc.mfa_otp, 'MFA OTP hash generated and stored on admin document');

        const badOtpRes = await request('/api/auth/verify-mfa', {
            method: 'POST',
            body: {
                mfa_token: mfaChallengeRes.body.mfa_token,
                otp: '000000'
            }
        });
        assert(badOtpRes.status === 400, `Invalid OTP rejected with HTTP ${badOtpRes.status}`);

        // Find the valid OTP by testing against the hash or setting a test OTP
        const crypto = await import('crypto');
        const testOtp = '123456';
        adminDoc.mfa_otp = crypto.createHash('sha256').update(testOtp).digest('hex');
        await adminDoc.save();

        const validOtpRes = await request('/api/auth/verify-mfa', {
            method: 'POST',
            body: {
                mfa_token: mfaChallengeRes.body.mfa_token,
                otp: testOtp
            }
        });
        assert(validOtpRes.status === 200, 'Valid OTP accepted');
        assert(!!validOtpRes.body.token, 'Full access JWT issued after successful MFA');

        const mfaProfRes = await request('/api/admin/stats', {
            headers: { Authorization: `Bearer ${validOtpRes.body.token}` }
        });
        assert(mfaProfRes.status === 200, 'Post-MFA token grants full authorized access to admin stats');

        const replayOtpRes = await request('/api/auth/verify-mfa', {
            method: 'POST',
            body: {
                mfa_token: mfaChallengeRes.body.mfa_token,
                otp: testOtp
            }
        });
        assert(replayOtpRes.status === 400, 'Replay of used MFA OTP rejected');

        // Cleanup: disable MFA on Admin A to restore baseline
        await request('/api/auth/mfa/toggle', {
            method: 'POST',
            headers: { Authorization: `Bearer ${validOtpRes.body.token}` },
            body: { enabled: false, password: 'Password123!' }
        });
    } catch (err) {
        assert(false, `MFA workflow test error: ${err.message}`);
    }

    console.log('\n====================================================');
    console.log(`DEEP SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (server) server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async err => {
    console.error('Test execution fatal error:', err);
    if (server) server.close();
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
