import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './server.js';
import Institution from './models/Institution.js';
import Admin from './models/Admin.js';
import Hostel from './models/Hostel.js';
import Student from './models/Student.js';
import Room from './models/Room.js';
import RoomRequest from './models/RoomRequest.js';
import { generateToken } from './middleware/authMiddleware.js';

dotenv.config();

const PORT = 5011;
let server;

async function runAcceptanceTests() {
  console.log('🚀 Initializing Final Acceptance & Security Audit Test Suite...\n');

  try {
    await new Promise((r) => setTimeout(r, 1500));
    server = app.listen(PORT, () => console.log(`✅ Acceptance Test Server listening on port :${PORT}`));

    const baseUrl = `http://127.0.0.1:${PORT}`;

    // Clean up test-specific items
    await Institution.deleteMany({ code: { $regex: /^ACCEPT_/ } });
    await Admin.deleteMany({ email: { $regex: /@accept\.com$/ } });
    await Student.deleteMany({ email: { $regex: /@accept\.com$/ } });

    // 1. Setup Test Super Admin
    const superAdmin = await Admin.create({
      username: 'accept_superadmin',
      email: 'super@accept.com',
      password: 'password123',
      role: 'super_admin',
      full_name: 'Super Admin Acceptance',
    });
    const superToken = generateToken(superAdmin._id, 'super_admin');

    // 2. Setup Test Institution & Admin
    const inst = await Institution.create({
      name: 'ACCEPT_Engineering College',
      code: 'ACCEPT_EC01',
      institution_type: 'College',
      contact_email: 'admin@accept.com',
      contact_phone: '+91 9999988888',
      address: 'Acceptance Road, Tech Park',
      status: 'Approved',
      admin_details: {
        full_name: 'Dr. Accept Admin',
        email: 'admin@accept.com',
      },
    });

    const instAdmin = await Admin.create({
      username: 'accept_admin',
      email: 'admin@accept.com',
      password: 'password123',
      role: 'institution_admin',
      institution: inst._id,
      full_name: 'Dr. Accept Admin',
    });
    const instAdminToken = generateToken(instAdmin._id, 'institution_admin', { institution: inst._id });

    // Setup Hostel & Rooms
    const hostel = await Hostel.create({
      institution: inst._id,
      name: 'ACCEPT_Hostel 1',
      type: 'Boys',
      block_number: 'B1',
      address: 'Campus West',
      contact_number: '+91 9999977777',
      gps_latitude: 28.75,
      gps_longitude: 77.11,
      gps_radius: 200,
    });

    const room1 = await Room.create({
      institution: inst._id,
      hostel: hostel._id,
      room_number: 'R-101',
      room_type: 'Double',
      total_beds: 2,
      available_beds: 1,
    });

    const room2 = await Room.create({
      institution: inst._id,
      hostel: hostel._id,
      room_number: 'R-102',
      room_type: 'Double',
      total_beds: 2,
      available_beds: 2,
    });

    // Setup Student
    const student = await Student.create({
      institution: inst._id,
      hostel: hostel._id,
      room: room1._id,
      full_name: 'Acceptance Student',
      email: 'student@accept.com',
      roll_number: 'ACCEPT_ROLL_01',
      department: 'CSE',
      phone: '+91 9999966666',
      password: 'password123',
      is_approved: true,
    });
    const studentToken = generateToken(student._id, 'student');

    console.log('─── 1. Super Admin Platform Telemetry & Directory ───');

    // Test 1: Get Platform Analytics
    const analyticsRes = await fetch(`${baseUrl}/api/super-admin/analytics`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    const analyticsData = await analyticsRes.json();
    if (analyticsRes.status === 200 && analyticsData.success && analyticsData.analytics.totalInstitutions > 0) {
      console.log('  ✅ Super Admin fetches platform analytics successfully');
    } else {
      throw new Error(`Failed platform analytics: ${JSON.stringify(analyticsData)}`);
    }

    // Test 2: Get All Institutions Directory with metrics
    const dirRes = await fetch(`${baseUrl}/api/super-admin/institutions?status=Approved`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    const dirData = await dirRes.json();
    if (dirRes.status === 200 && dirData.success && dirData.institutions.length > 0) {
      const found = dirData.institutions.find((i) => i.code === 'ACCEPT_EC01');
      if (found && found.metrics?.hostels >= 1) {
        console.log('  ✅ Super Admin fetches directory with enriched metrics per institution');
      } else {
        throw new Error('Metrics missing from directory response');
      }
    } else {
      throw new Error(`Failed institutions directory: ${JSON.stringify(dirData)}`);
    }

    console.log('\n─── 2. Super Admin Suspension & Tenant Enforcement ───');

    // Test 3: Suspend Institution
    const suspendRes = await fetch(`${baseUrl}/api/super-admin/institutions/${inst._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({ status: 'Suspended', reason: 'Audit Compliance Check' }),
    });
    const suspendData = await suspendRes.json();
    if (suspendRes.status === 200 && suspendData.institution.status === 'Suspended') {
      console.log('  ✅ Super Admin successfully suspended institution account');
    } else {
      throw new Error(`Failed to suspend institution: ${JSON.stringify(suspendData)}`);
    }

    // Test 4: Suspended Institution Admin access is blocked with 403
    const blockedRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${instAdminToken}` },
    });
    if (blockedRes.status === 403) {
      console.log('  ✅ Suspended Institution Admin blocked from accessing operational APIs (HTTP 403)');
    } else {
      throw new Error(`Suspended tenant access should be 403, got ${blockedRes.status}`);
    }

    // Test 5: Reactivate Institution
    const reactivateRes = await fetch(`${baseUrl}/api/super-admin/institutions/${inst._id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({ status: 'Approved' }),
    });
    const reactivateData = await reactivateRes.json();
    if (reactivateRes.status === 200 && reactivateData.institution.status === 'Approved') {
      console.log('  ✅ Super Admin reactivated institution to Approved status');
    } else {
      throw new Error(`Failed to reactivate: ${JSON.stringify(reactivateData)}`);
    }

    // Test 6: Institution Admin access restored
    const restoredRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${instAdminToken}` },
    });
    if (restoredRes.status === 200) {
      console.log('  ✅ Restored Institution Admin successfully accesses operational APIs (HTTP 200)');
    } else {
      throw new Error(`Restored tenant access failed: ${restoredRes.status}`);
    }

    console.log('\n─── 3. Session Verification & Security (/auth/me) ───');

    // Test 7: /auth/me returns institution_name and role without password
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${instAdminToken}` },
    });
    const meData = await meRes.json();
    if (
      meRes.status === 200 &&
      meData.success &&
      meData.user.role === 'institution_admin' &&
      meData.user.institution_name === 'ACCEPT_Engineering College' &&
      !meData.user.password
    ) {
      console.log('  ✅ GET /auth/me preserves institution metadata and hides password hashes');
    } else {
      throw new Error(`Invalid /auth/me response: ${JSON.stringify(meData)}`);
    }

    console.log('\n─── 4. Student Self-Registration with Hostel Preference ───');

    // Test 8: Register Student with hostel_id (auto resolves institution)
    const selfRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Auto Resolving Student',
        email: 'autostudent@accept.com',
        roll_number: 'ACCEPT_ROLL_02',
        department: 'Information Technology',
        phone: '+91 9999955555',
        password: 'password123',
        hostel_id: hostel._id,
      }),
    });
    const selfRegData = await selfRegRes.json();
    if (selfRegRes.status === 201 && selfRegData.success) {
      console.log('  ✅ Student self-registration automatically resolves tenant institution from hostel_id');
    } else {
      throw new Error(`Failed self-registration: ${JSON.stringify(selfRegData)}`);
    }

    console.log('\n─── 5. Institution Admin Room Transfer Execution ───');

    // Create room request
    const roomReq = await RoomRequest.create({
      institution: inst._id,
      hostel: hostel._id,
      student: student._id,
      current_room: room1._id,
      preferred_room_type: 'Double',
      reason: 'Need ground floor room',
      status: 'Pending',
    });

    // Test 9: Institution Admin fetches room requests
    const getReqsRes = await fetch(`${baseUrl}/api/admin/room-requests`, {
      headers: { Authorization: `Bearer ${instAdminToken}` },
    });
    const getReqsData = await getReqsRes.json();
    if (getReqsRes.status === 200 && getReqsData.requests.some((r) => r._id === String(roomReq._id))) {
      console.log('  ✅ Institution Admin fetches pending room transfer requests');
    } else {
      throw new Error(`Failed to fetch room requests: ${JSON.stringify(getReqsData)}`);
    }

    // Test 10: Institution Admin approves transfer to room 2
    const approveTransferRes = await fetch(`${baseUrl}/api/admin/room-requests/${roomReq._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instAdminToken}` },
      body: JSON.stringify({
        status: 'Approved',
        new_room_id: room2._id,
        admin_remarks: 'Approved by Campus Administrator',
      }),
    });
    const approveTransferData = await approveTransferRes.json();
    if (approveTransferRes.status === 200 && approveTransferData.success) {
      const updatedR1 = await Room.findById(room1._id);
      const updatedR2 = await Room.findById(room2._id);
      const updatedStudent = await Student.findById(student._id);

      if (updatedR1.available_beds === 2 && updatedR2.available_beds === 1 && String(updatedStudent.room) === String(room2._id)) {
        console.log('  ✅ Institution Admin transfer executed atomic bed balance (old room: +1, new room: -1)');
      } else {
        throw new Error(`Bed balance inconsistency: R1 beds=${updatedR1.available_beds}, R2 beds=${updatedR2.available_beds}`);
      }
    } else {
      throw new Error(`Failed to approve room transfer: ${JSON.stringify(approveTransferData)}`);
    }

    console.log('\n───────────────────────────────────────────────────────');
    console.log('🏁 Final Acceptance Test Suite: 10 Passed, 0 Failed');
    console.log('───────────────────────────────────────────────────────\n');

    // Clean up
    await Institution.deleteMany({ code: { $regex: /^ACCEPT_/ } });
    await Admin.deleteMany({ email: { $regex: /@accept\.com$/ } });
    await Student.deleteMany({ email: { $regex: /@accept\.com$/ } });
    await Hostel.deleteMany({ name: { $regex: /^ACCEPT_/ } });
    await Room.deleteMany({ institution: inst._id });
    await RoomRequest.deleteMany({ institution: inst._id });

    if (server) server.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Acceptance Test Failed:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runAcceptanceTests();
