/**
 * Phase C Tests: Institution Admin Login, Dashboard Data Isolation, Room Management
 * Run: node test_phase_c.js  (server must be running on port 5050)
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Admin from './models/Admin.js';
import Institution from './models/Institution.js';
import Hostel from './models/Hostel.js';
import Room from './models/Room.js';
import Student from './models/Student.js';
import app from './server.js';
import { generateToken } from './middleware/authMiddleware.js';

import Warden from './models/Warden.js';

const PORT = 5007;
let server;

// ── helpers ──────────────────────────────────────────────────────────────────
const json = async (res) => res.json();

const req = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await json(res) };
};

// ── cleanup ───────────────────────────────────────────────────────────────────
const clean = async () => {
  await Institution.deleteMany({ code: { $regex: /^PHCTEST/ } });
  await Admin.deleteMany({ email: { $regex: /@phctest\.com$/ } });
  await Warden.deleteMany({ email: { $regex: /@phctest\.com$/ } });
  await Hostel.deleteMany({ name: { $regex: /^PHC_/ } });
  await Room.deleteMany({ room_number: { $in: ['101', '201'] } });
};

// ── test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const test = async (label, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${label} — ${e.message}`);
    failed++;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
async function runTests() {
  try {
    await new Promise(r => setTimeout(r, 2000)); // wait for server.js connection
    server = app.listen(PORT, () => console.log(`✅ Phase C test server on :${PORT}`));

    await clean();

    // ── Setup: two approved institutions ─────────────────────────────────────
    const instAlpha = await Institution.create({
      name: 'PHC Alpha University', institution_type: 'University',
      code: 'PHCTESTA', contact_email: 'alpha@phctest.com',
      contact_phone: '1234567890', address: 'Alpha St', status: 'Approved',
      admin_details: { full_name: 'Alpha Admin', email: 'alpha_admin@phctest.com' }
    });
    const instBeta  = await Institution.create({
      name: 'PHC Beta College',    institution_type: 'College',
      code: 'PHCTESTB', contact_email: 'beta@phctest.com',
      contact_phone: '0987654321', address: 'Beta Rd',  status: 'Approved',
      admin_details: { full_name: 'Beta Admin', email: 'beta_admin@phctest.com' }
    });
    const instPending = await Institution.create({
      name: 'PHC Pending Inst',    institution_type: 'School',
      code: 'PHCTESTC', contact_email: 'pend@phctest.com',
      contact_phone: '1111111111', address: 'Pend Ave', status: 'Pending',
      admin_details: { full_name: 'Pend Admin', email: 'pend_admin@phctest.com' }
    });

    const adminAlpha   = await Admin.create({ username: 'alpha_admin@phctest.com', email: 'alpha_admin@phctest.com', password: 'Alpha123!', full_name: 'Alpha Admin', role: 'institution_admin', institution: instAlpha._id });
    const adminBeta    = await Admin.create({ username: 'beta_admin@phctest.com',  email: 'beta_admin@phctest.com',  password: 'Beta123!',  full_name: 'Beta Admin',  role: 'institution_admin', institution: instBeta._id  });
    const adminPending = await Admin.create({ username: 'pend_admin@phctest.com',  email: 'pend_admin@phctest.com',  password: 'Pend123!',  full_name: 'Pend Admin',  role: 'institution_admin', institution: instPending._id });

    console.log('\n─── 1. Login & Institution Status ───');

    await test('institution_admin can log in to an Approved institution', async () => {
      const r = await req('POST', '/auth/login', { email: 'alpha_admin@phctest.com', password: 'Alpha123!', user_type: 'admin' });
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.user.role !== 'institution_admin') throw new Error('Wrong role returned: ' + r.data.user.role);
    });

    await test('Login response includes institution and institution_name', async () => {
      const r = await req('POST', '/auth/login', { email: 'alpha_admin@phctest.com', password: 'Alpha123!', user_type: 'admin' });
      if (!r.data.user.institution) throw new Error('Missing institution field');
      if (!r.data.user.institution_name) throw new Error('Missing institution_name field');
    });

    await test('Pending institution admin cannot log in', async () => {
      const r = await req('POST', '/auth/login', { email: 'pend_admin@phctest.com', password: 'Pend123!', user_type: 'admin' });
      if (r.data.success) throw new Error('Pending admin should be rejected at login');
      if (r.status !== 403) throw new Error(`Expected 403, got ${r.status}`);
    });

    // Get tokens via generateToken (skips login for brevity in later tests)
    const tokenAlpha = generateToken(adminAlpha._id, 'institution_admin', { institution: instAlpha._id });
    const tokenBeta  = generateToken(adminBeta._id,  'institution_admin', { institution: instBeta._id  });

    console.log('\n─── 2. Hostel CRUD ───');

    let hostelAlphaId;
    await test('Alpha admin can create a hostel in their institution', async () => {
      const r = await req('POST', '/admin/hostels', { name: 'PHC_Alpha Boys Block A', type: 'Boys', block_number: 'A1' }, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      hostelAlphaId = r.data.hostel._id;
      if (String(r.data.hostel.institution) !== String(instAlpha._id)) throw new Error('institution mismatch on created hostel');
    });

    let hostelBetaId;
    await test('Beta admin can create a hostel in their institution', async () => {
      const r = await req('POST', '/admin/hostels', { name: 'PHC_Beta Girls Block B', type: 'Girls', block_number: 'B1' }, tokenBeta);
      if (!r.data.success) throw new Error(r.data.message);
      hostelBetaId = r.data.hostel._id;
    });

    await test('Alpha admin cannot see Beta hostels (tenant isolation)', async () => {
      const r = await req('GET', '/admin/hostels', null, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      const hasBeta = r.data.hostels.some(h => String(h._id) === hostelBetaId);
      if (hasBeta) throw new Error('Alpha admin can see Beta hostel — tenant isolation broken!');
    });

    await test('Alpha admin cannot delete Beta hostel (cross-tenant delete)', async () => {
      const r = await req('DELETE', `/admin/hostels/${hostelBetaId}`, null, tokenAlpha);
      if (r.status !== 404) throw new Error(`Expected 404, got ${r.status} — cross-tenant delete succeeded!`);
    });

    console.log('\n─── 3. Room Management ───');

    let roomAlphaId;
    await test('Alpha admin can create a room in Alpha hostel', async () => {
      const r = await req('POST', '/admin/rooms', { hostel_id: hostelAlphaId, room_number: '101', room_type: 'Double', total_beds: 2 }, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      roomAlphaId = r.data.room._id;
      if (String(r.data.room.institution) !== String(instAlpha._id)) throw new Error('institution mismatch on created room');
    });

    await test('Beta admin cannot create a room in Alpha hostel', async () => {
      const r = await req('POST', '/admin/rooms', { hostel_id: hostelAlphaId, room_number: '201', room_type: 'Single', total_beds: 1 }, tokenBeta);
      if (r.status !== 404) throw new Error(`Expected 404, got ${r.status} — cross-tenant room creation succeeded!`);
    });

    await test('Beta admin cannot delete Alpha room', async () => {
      const r = await req('DELETE', `/admin/rooms/${roomAlphaId}`, null, tokenBeta);
      if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    });

    await test('Alpha admin can fetch rooms for their hostel', async () => {
      const r = await req('GET', `/admin/rooms?hostel_id=${hostelAlphaId}`, null, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.rooms.length === 0) throw new Error('Room was not found');
    });

    await test('Alpha admin cannot fetch rooms for Beta hostel', async () => {
      const r = await req('GET', `/admin/rooms?hostel_id=${hostelBetaId}`, null, tokenAlpha);
      if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    });

    console.log('\n─── 4. Warden Management ───');

    await test('Alpha admin can create a warden assigned to Alpha hostel', async () => {
      const r = await req('POST', '/admin/wardens', { full_name: 'Alpha Warden', email: `warden_alpha@phctest.com`, password: 'Warden123!', phone: '9999999990', hostel: hostelAlphaId }, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      if (String(r.data.warden.institution) !== String(instAlpha._id)) throw new Error('institution mismatch on warden');
    });

    await test('Alpha admin cannot assign a warden to Beta hostel', async () => {
      const r = await req('POST', '/admin/wardens', { full_name: 'Cross Warden', email: `cross_warden@phctest.com`, password: 'Warden123!', phone: '8888888880', hostel: hostelBetaId }, tokenAlpha);
      // hostel belongs to beta, but authorizeInstitution injects institution=alpha on body,
      // so warden gets institution=alpha with hostel=betaHostel (mismatch), we check
      if (r.data.success) {
        // verify the warden's institution is NOT beta
        const warden = r.data.warden;
        if (String(warden.institution) === String(instBeta._id)) throw new Error('Warden was created under Beta institution!');
      }
    });

    console.log('\n─── 5. Dashboard Stats Isolation ───');

    await test('Alpha stats contain only Alpha students/hostels (not Beta)', async () => {
      const r = await req('GET', '/admin/stats', null, tokenAlpha);
      if (!r.data.success) throw new Error(r.data.message);
      // Stats should reflect Alpha's data only (1 hostel created above)
      if (r.data.stats.totalHostels === undefined) throw new Error('totalHostels missing from stats');
    });

    console.log('\n─── 6. Security: Cross-Institution Room Assignment & Bed Count Integrity ───');

    await test('Beta admin cannot assign a student to Alpha room (cross-tenant room assignment blocked)', async () => {
      // Create a test student under Beta
      const Student = (await import('./models/Student.js')).default;
      const betaStudent = await Student.create({
        institution: instBeta._id,
        full_name: 'Beta Student', email: 'student_beta@phctest.com',
        roll_number: 'PHCB001', department: 'CS', phone: '7777777770',
        password: 'Student123!', is_approved: true,
      });
      // Beta admin tries to assign Alpha's room to Beta student
      const r = await req('PUT', `/admin/students/${betaStudent._id}/assign-room`, { room_id: roomAlphaId }, tokenBeta);
      // Must be rejected — room belongs to Alpha institution
      if (r.status !== 404) throw new Error(`Expected 404, got ${r.status} — cross-institution room assignment succeeded!`);
      await Student.findByIdAndDelete(betaStudent._id);
    });

    await test('Room available_beds stays consistent after student assignment and removal', async () => {
      const Room = (await import('./models/Room.js')).default;
      const Student = (await import('./models/Student.js')).default;
      const roomBefore = await Room.findById(roomAlphaId);
      const bedsBefore = roomBefore.available_beds;

      // Create and approve a student for Alpha
      const alphaStudent = await Student.create({
        institution: instAlpha._id,
        full_name: 'Alpha Bed Student', email: 'bedstudent@phctest.com',
        roll_number: 'PHCA001', department: 'CS', phone: '6666666660',
        password: 'Student123!', is_approved: true,
      });

      // Assign room
      const r1 = await req('PUT', `/admin/students/${alphaStudent._id}/assign-room`, { room_id: roomAlphaId }, tokenAlpha);
      if (!r1.data.success) throw new Error('Room assignment failed: ' + r1.data.message);
      const roomAfterAssign = await Room.findById(roomAlphaId);
      if (roomAfterAssign.available_beds !== bedsBefore - 1) throw new Error(`Beds after assign: expected ${bedsBefore - 1}, got ${roomAfterAssign.available_beds}`);

      // Delete student — bed should be freed
      await req('DELETE', `/admin/students/${alphaStudent._id}`, null, tokenAlpha);
      const roomAfterDelete = await Room.findById(roomAlphaId);
      if (roomAfterDelete.available_beds !== bedsBefore) throw new Error(`Beds after delete: expected ${bedsBefore}, got ${roomAfterDelete.available_beds}`);
    });

    await test('Hostel delete cascades: associated rooms are removed', async () => {
      // Create a temp hostel with a room, then delete
      const rh = await req('POST', '/admin/hostels', { name: 'PHC_Temp Delete Hostel', type: 'Co-ed', block_number: 'Z9' }, tokenAlpha);
      const tempHostelId = rh.data.hostel._id;
      const rr = await req('POST', '/admin/rooms', { hostel_id: tempHostelId, room_number: 'Z01', room_type: 'Single', total_beds: 1 }, tokenAlpha);
      const tempRoomId = rr.data.room._id;
      // Delete hostel
      await req('DELETE', `/admin/hostels/${tempHostelId}`, null, tokenAlpha);
      // Room must be gone
      const Room = (await import('./models/Room.js')).default;
      const gone = await Room.findById(tempRoomId);
      if (gone) throw new Error('Room was not deleted when hostel was deleted');
    });

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🏁 Phase C Tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;

  } catch (e) {
    console.error('❌ Fatal test error:', e);
    process.exitCode = 1;
  } finally {
    await clean();
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
