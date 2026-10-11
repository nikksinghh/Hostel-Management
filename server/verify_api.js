import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://127.0.0.1:5050/api';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campushome';

async function runDetailedApiVerification() {
  await mongoose.connect(MONGO_URI);
  console.log('🧪 Starting End-to-End API Verification against Running Server (http://127.0.0.1:5050)...\n');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  };

  // 1. Super Admin Login
  let superToken = '';
  await test('Super Admin login returns correct role & token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@campushome.com', password: 'SuperAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    if (data.user.role !== 'super_admin') throw new Error(`Expected role super_admin, got ${data.user.role}`);
    superToken = data.token;
  });

  // 2. Approved Institution Admin Login
  let apexToken = '';
  await test('Approved Institution Admin login succeeds with institution details', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'apex_admin@apex.edu', password: 'ApexAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    if (data.user.role !== 'institution_admin') throw new Error(`Expected role institution_admin, got ${data.user.role}`);
    if (data.user.institution_name !== 'Apex Global University') throw new Error(`Wrong institution_name: ${data.user.institution_name}`);
    apexToken = data.token;
  });

  // 3. Pending Institution Admin Login Blocked
  await test('Pending Institution Admin login is blocked (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pending_admin@pending.edu', password: 'PendingAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (res.status !== 403) throw new Error(`Expected status 403, got ${res.status}`);
    if (!data.message.toLowerCase().includes('pending')) throw new Error(`Message should mention Pending: ${data.message}`);
  });

  // 4. Rejected Institution Admin Login Blocked
  await test('Rejected Institution Admin login is blocked (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rejected_admin@rejected.edu', password: 'RejectedAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (res.status !== 403) throw new Error(`Expected status 403, got ${res.status}`);
    if (!data.message.toLowerCase().includes('rejected')) throw new Error(`Message should mention Rejected: ${data.message}`);
  });

  // 5. Suspended Institution Admin Login Blocked
  await test('Suspended Institution Admin login is blocked (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'suspended_admin@suspended.edu', password: 'SuspendedAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (res.status !== 403) throw new Error(`Expected status 403, got ${res.status}`);
    if (!data.message.toLowerCase().includes('suspended')) throw new Error(`Message should mention Suspended: ${data.message}`);
  });

  // 6. Warden Login
  await test('Warden login succeeds with role warden', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'apex_warden@apex.edu', password: 'Warden123!', user_type: 'warden' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    if (data.user.role !== 'warden') throw new Error(`Expected role warden, got ${data.user.role}`);
  });

  // 7. Student Login
  await test('Approved Student login succeeds with role student', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'apex_student@apex.edu', password: 'Student123!', user_type: 'student' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');
    if (data.user.role !== 'student') throw new Error(`Expected role student, got ${data.user.role}`);
  });

  // 8. Pending Student Login Blocked
  await test('Unapproved Student login is blocked (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new_student@apex.edu', password: 'Student123!', user_type: 'student' })
    });
    const data = await res.json();
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 9. Institution Admin: Create, View, Edit, and Delete Hostel
  let createdHostelId = '';
  await test('Apex Admin creates a new hostel', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({
        name: 'Apex New Horizon Hostel',
        type: 'Boys',
        block_number: 'NH-1',
        address: 'North Campus Lane 2',
        contact_number: '9876543210'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Hostel creation failed');
    createdHostelId = data.hostel._id;
  });

  await test('Apex Admin views hostels and sees the new hostel', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels`, {
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Fetch hostels failed');
    const found = data.hostels.some(h => h._id === createdHostelId);
    if (!found) throw new Error('Created hostel not found in hostel list');
  });

  await test('Apex Admin edits the hostel', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels/${createdHostelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({
        name: 'Apex Horizon Block 2',
        type: 'Boys',
        block_number: 'NH-1'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Hostel edit failed');
    if (data.hostel.name !== 'Apex Horizon Block 2') throw new Error(`Name not updated: ${data.hostel.name}`);
  });

  await test('Apex Admin deletes the created hostel', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels/${createdHostelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Hostel delete failed');
  });

  // 10. Room Management & Student Approval/Room Assignment Workflow
  let apexPioneerHostelId = '';
  await test('Apex Admin gets existing Apex Pioneer Hostel', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels`, {
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const data = await res.json();
    const pioneer = data.hostels.find(h => h.name === 'Apex Pioneer Hostel');
    if (!pioneer) throw new Error('Apex Pioneer Hostel not found');
    apexPioneerHostelId = pioneer._id;
  });

  let room101Id = '';
  let room102Id = '';
  await test('Apex Admin creates Room 101 (Double, 2 beds) & Room 102 (Single, 1 bed)', async () => {
    const res1 = await fetch(`${BASE_URL}/admin/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({
        hostel_id: apexPioneerHostelId,
        room_number: '101',
        room_type: 'Double',
        total_beds: 2
      })
    });
    const data1 = await res1.json();
    if (!res1.ok || !data1.success) throw new Error(data1.message || 'Create room 101 failed');
    room101Id = data1.room._id;
    if (data1.room.available_beds !== 2) throw new Error(`Expected 2 available beds, got ${data1.room.available_beds}`);

    const res2 = await fetch(`${BASE_URL}/admin/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({
        hostel_id: apexPioneerHostelId,
        room_number: '102',
        room_type: 'Single',
        total_beds: 1
      })
    });
    const data2 = await res2.json();
    if (!res2.ok || !data2.success) throw new Error(data2.message || 'Create room 102 failed');
    room102Id = data2.room._id;
  });

  let pendingStudentId = '';
  await test('Apex Admin fetches students and finds unapproved student', async () => {
    const res = await fetch(`${BASE_URL}/admin/students`, {
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Fetch students failed');
    const student = data.students.find(s => s.email === 'new_student@apex.edu');
    if (!student) throw new Error('Pending student new_student@apex.edu not found');
    if (student.is_approved !== false) throw new Error('Student should be unapproved initially');
    pendingStudentId = student._id;
  });

  await test('Apex Admin approves student and assigns Room 101', async () => {
    // Approve student
    const approveRes = await fetch(`${BASE_URL}/admin/students/${pendingStudentId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({ is_approved: true })
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok || !approveData.success) throw new Error(approveData.message || 'Approve student failed');

    // Assign room 101
    const assignRes = await fetch(`${BASE_URL}/admin/students/${pendingStudentId}/assign-room`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apexToken}` },
      body: JSON.stringify({ room_id: room101Id })
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok || !assignData.success) throw new Error(assignData.message || 'Assign room failed');
  });

  await test('Room 101 available bed count decremented to 1 and stats occupancy updated', async () => {
    // Check Room 101
    const resRooms = await fetch(`${BASE_URL}/admin/rooms?hostel_id=${apexPioneerHostelId}`, {
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const dataRooms = await resRooms.json();
    const r101 = dataRooms.rooms.find(r => r._id === room101Id);
    if (!r101) throw new Error('Room 101 not found');
    if (r101.available_beds !== 1) throw new Error(`Expected 1 available bed in Room 101, got ${r101.available_beds}`);

    // Check Stats
    const resStats = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${apexToken}` }
    });
    const dataStats = await resStats.json();
    if (!resStats.ok || !dataStats.success) throw new Error(dataStats.message || 'Fetch stats failed');
    if (dataStats.stats.totalRooms < 2) throw new Error(`Expected at least 2 rooms in stats, got ${dataStats.stats.totalRooms}`);
    if (dataStats.stats.totalBeds < 3) throw new Error(`Expected at least 3 total beds, got ${dataStats.stats.totalBeds}`);
    if (dataStats.stats.occupiedBeds < 1) throw new Error(`Expected at least 1 occupied bed, got ${dataStats.stats.occupiedBeds}`);
  });

  // 11. Cross-Tenant Isolation Enforcement
  let zenithToken = '';
  await test('Zenith Admin logs in for cross-tenant testing', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'zenith_admin@zenith.edu', password: 'ZenithAdmin123!', user_type: 'admin' })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Zenith login failed');
    zenithToken = data.token;
  });

  await test('Zenith Admin CANNOT access Apex hostels (tenant isolation)', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels`, {
      headers: { 'Authorization': `Bearer ${zenithToken}` }
    });
    const data = await res.json();
    const hasApex = data.hostels.some(h => h.name.includes('Apex'));
    if (hasApex) throw new Error('Cross-tenant leak: Zenith Admin can see Apex hostels!');
  });

  await test('Zenith Admin CANNOT delete Apex hostel (404)', async () => {
    const res = await fetch(`${BASE_URL}/admin/hostels/${apexPioneerHostelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${zenithToken}` }
    });
    if (res.status !== 404) throw new Error(`Expected 404 for cross-tenant delete, got ${res.status}`);
  });

  await test('Zenith Admin CANNOT create room in Apex hostel (404)', async () => {
    const res = await fetch(`${BASE_URL}/admin/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${zenithToken}` },
      body: JSON.stringify({
        hostel_id: apexPioneerHostelId,
        room_number: 'ZENITH-HACK',
        room_type: 'Single',
        total_beds: 1
      })
    });
    if (res.status !== 404) throw new Error(`Expected 404 for cross-tenant room creation, got ${res.status}`);
  });

  await test('Zenith Admin CANNOT assign Apex Room 101 to Zenith student (404)', async () => {
    // Create a zenith student first
    const Student = (await import('./models/Student.js')).default;
    const Institution = (await import('./models/Institution.js')).default;
    const zenithInst = await Institution.findOne({ code: 'ZENITH01' });
    const zStudent = await Student.create({
      institution: zenithInst._id,
      full_name: 'Zenith Student Test',
      email: 'zenith_s@zenith.edu',
      roll_number: 'Z-001',
      drcc_id: 'ZDRCC-1',
      department: 'EE',
      phone: '9876543200',
      password: 'Student123!',
      is_approved: true
    });

    const res = await fetch(`${BASE_URL}/admin/students/${zStudent._id}/assign-room`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${zenithToken}` },
      body: JSON.stringify({ room_id: room101Id })
    });
    if (res.status !== 404) throw new Error(`Expected 404 for cross-tenant room assignment, got ${res.status}`);

    await Student.findByIdAndDelete(zStudent._id);
  });

  await mongoose.connection.close();
  console.log(`\n======================================================`);
  console.log(`🏁 API Verification Completed: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);
  if (failed > 0) process.exit(1);
}

runDetailedApiVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
