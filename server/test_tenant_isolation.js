import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import app from './server.js';
import Admin from './models/Admin.js';
import Institution from './models/Institution.js';
import Hostel from './models/Hostel.js';
import Student from './models/Student.js';
import { generateToken } from './middleware/authMiddleware.js';

dotenv.config();

const PORT = 5005;
let server;

async function runTests() {
  try {
    // 1. Wait for server.js to establish connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Waiting for DB connection from server.js');
    
    server = app.listen(PORT, () => console.log(`✅ Test server running on port ${PORT}`));

    // Clean up previous test data
    await Institution.deleteMany({ name: { $regex: /^TEST_/ } });
    await Admin.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Hostel.deleteMany({ name: { $regex: /^TEST_/ } });

    console.log('\n--- 🧪 TEST 1: Valid institution registration creates a Pending application ---');
    const regRes = await fetch(`http://127.0.0.1:${PORT}/api/public/institutions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST_University A',
        institution_type: 'University',
        code: 'TESTA123',
        contact_email: 'contact@testa.com',
        contact_phone: '1234567890',
        address: 'Test Addr',
        admin_full_name: 'Admin A',
        admin_email: 'admin_a@test.com',
        admin_password: 'Password123'
      })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error('Registration failed: ' + regData.message);
    const instA = await Institution.findById(regData.institutionId);
    if (!instA || instA.status !== 'Pending') throw new Error('Institution not created or not Pending');
    console.log('✅ Test 1 Passed');

    console.log('\n--- 🧪 TEST 2: Invalid registration is rejected ---');
    const invalidRegRes = await fetch(`http://127.0.0.1:${PORT}/api/public/institutions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST_University B'
        // missing fields
      })
    });
    const invalidRegData = await invalidRegRes.json();
    if (invalidRegData.success) throw new Error('Invalid registration should fail');
    console.log('✅ Test 2 Passed');

    console.log('\n--- 🧪 TEST 3: Public users cannot create a super_admin ---');
    const adminUserA = await Admin.findOne({ email: 'admin_a@test.com' });
    if (adminUserA.role === 'super_admin') throw new Error('User created as super_admin!');
    console.log('✅ Test 3 Passed');

    console.log('\n--- 🧪 TEST 4: Pending institutions cannot access protected dashboards ---');
    // Phase C change: login itself now rejects Pending institution admins with 403
    const loginRes = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin_a@test.com', password: 'Password123', user_type: 'admin' })
    });
    const loginData = await loginRes.json();
    // The login should now be rejected with 403 because institution is Pending
    if (loginData.success) throw new Error('Pending institution admin login should be blocked');
    if (loginRes.status !== 403) throw new Error(`Expected login to return 403 for pending institution, got ${loginRes.status}`);
    // Additionally verify that a token manually crafted for the pending institution admin
    // is blocked by the protect middleware (double-layer protection)
    const { generateToken } = await import('./middleware/authMiddleware.js');
    const pendingInst = await (await import('./models/Institution.js')).default.findOne({ name: 'TEST_University A' });
    const pendingAdminDoc = await (await import('./models/Admin.js')).default.findOne({ email: 'admin_a@test.com' });
    const craftedToken = generateToken(pendingAdminDoc._id, 'institution_admin', { institution: pendingInst._id });
    const statsRes = await fetch(`http://127.0.0.1:${PORT}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${craftedToken}` }
    });
    if (statsRes.status !== 403) throw new Error('Protect middleware should block pending institution on API calls. Status: ' + statsRes.status);
    console.log('✅ Test 4 Passed');

    console.log('\n--- 🧪 TEST 5: Only super_admin can approve or reject institutions ---');
    // Create a dummy super_admin in DB
    const superAdmin = await Admin.create({
      username: 'test_superadmin',
      email: 'super@test.com',
      password: 'Password123',
      full_name: 'Super Admin',
      role: 'super_admin'
    });
    const superToken = generateToken(superAdmin._id, 'super_admin');

    // Approve the institution
    const approveRes = await fetch(`http://127.0.0.1:${PORT}/api/super-admin/institutions/${instA._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` },
      body: JSON.stringify({ status: 'Approved' })
    });
    const approveData = await approveRes.json();
    if (!approveData.success) throw new Error('Super admin approval failed');
    
    // Check if admin_a can approve themselves using their (now approved) token — should fail because only super_admin can access that route
    const selfApproveRes = await fetch(`http://127.0.0.1:${PORT}/api/super-admin/institutions/${instA._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${craftedToken}` }, // institution_admin token
      body: JSON.stringify({ status: 'Approved' })
    });
    if (selfApproveRes.status !== 403) throw new Error('Institution admin should not access super admin routes');
    console.log('✅ Test 5 Passed');

    console.log('\n--- 🧪 TEST 6: Institution A cannot read or modify Institution B\'s records ---');
    // Register Institution B
    await fetch(`http://127.0.0.1:${PORT}/api/public/institutions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST_University B',
        institution_type: 'University',
        code: 'TESTB123',
        contact_email: 'contact@testb.com',
        contact_phone: '1234567890',
        address: 'Test Addr',
        admin_full_name: 'Admin B',
        admin_email: 'admin_b@test.com',
        admin_password: 'Password123'
      })
    });
    const instB = await Institution.findOne({ code: 'TESTB123' });
    await Institution.findByIdAndUpdate(instB._id, { status: 'Approved' });
    const adminUserB = await Admin.findOne({ email: 'admin_b@test.com' });
    const tokenB = generateToken(adminUserB._id, 'institution_admin', { institution: instB._id });

    // Inst A creates a hostel using craftedToken (which had pending institution, now Approved in test 5)
    // After approval in Test 5 instA is approved, so craftedToken now works
    const createHostelResA = await fetch(`http://127.0.0.1:${PORT}/api/admin/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${craftedToken}` },
      body: JSON.stringify({ name: 'TEST_Hostel A', type: 'Boys', block_number: 'A1' }) // should auto-inject institution
    });
    const createHostelData = await createHostelResA.json();
    if (!createHostelData.success) throw new Error('Create hostel failed: ' + JSON.stringify(createHostelData));
    const hostelA = createHostelData.hostel;

    // Inst B tries to read hostels (should only see their own, which is 0)
    const readHostelResB = await fetch(`http://127.0.0.1:${PORT}/api/admin/hostels`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const readDataB = await readHostelResB.json();
    if (readDataB.hostels.length > 0) throw new Error('Institution B saw Institution A data');

    // Inst B tries to delete Inst A's hostel
    const deleteHostelResB = await fetch(`http://127.0.0.1:${PORT}/api/admin/hostels/${hostelA._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (deleteHostelResB.status !== 404) throw new Error('Institution B should get 404 when deleting A\'s hostel');
    console.log('✅ Test 6 Passed');

    console.log('\n--- 🧪 TEST 7: Changing IDs in URL/body does not bypass tenant isolation ---');
    // Inst B tries to update Inst A's hostel by injecting institution A ID
    const updateHostelResB = await fetch(`http://127.0.0.1:${PORT}/api/admin/hostels/${hostelA._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ name: 'Hacked', institution: instA._id }) // Injection attempt
    });
    if (updateHostelResB.status !== 403 && updateHostelResB.status !== 404) throw new Error('Institution injection succeeded!');
    console.log('✅ Test 7 Passed');

    console.log('\n🎉 ALL PHASE B TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests();
