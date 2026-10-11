/**
 * Phase D Comprehensive Test Suite:
 * Part 1: Security & Multi-Tenant Foundation
 * Part 2: Warden Dashboard & Role-Scoped Hostel Management
 * Part 3: Attendance & GPS Geofencing Server-Side Validation
 * Part 4: Leave Management & Overlap Prevention
 * Part 5: Complaints & In-App Notifications System
 * Part 6: Room Change Requests & Atomic Room Capacity Transfer
 *
 * Runs against live MongoDB and Express server on dedicated test port.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './server.js';
import Institution from './models/Institution.js';
import Admin from './models/Admin.js';
import Warden from './models/Warden.js';
import Student from './models/Student.js';
import Hostel from './models/Hostel.js';
import Room from './models/Room.js';
import Attendance from './models/Attendance.js';
import AttendanceSession from './models/AttendanceSession.js';
import LeaveRequest from './models/LeaveRequest.js';
import Complaint from './models/Complaint.js';
import RoomRequest from './models/RoomRequest.js';
import Payment from './models/Payment.js';
import Notification from './models/Notification.js';
import { generateToken } from './middleware/authMiddleware.js';

const PORT = 5009;
let server;

const req = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { status: res.status, data };
};

const clean = async () => {
  await Institution.deleteMany({ code: { $regex: /^PHDTEST/ } });
  await Admin.deleteMany({ email: { $regex: /@phdtest\.com$/ } });
  await Warden.deleteMany({ email: { $regex: /@phdtest\.com$/ } });
  await Student.deleteMany({ email: { $regex: /@phdtest\.com$/ } });
  await Hostel.deleteMany({ name: { $regex: /^PHD_/ } });
  await Room.deleteMany({ room_number: { $regex: /^PHD-/ } });
  await Attendance.deleteMany({ attendance_date: { $regex: /^2099-/ } });
  await AttendanceSession.deleteMany({ session_date: { $regex: /^2099-/ } });
  await LeaveRequest.deleteMany({ reason: { $regex: /^PHD_/ } });
  await Complaint.deleteMany({ description: { $regex: /^PHD_/ } });
  await RoomRequest.deleteMany({ reason: { $regex: /^PHD_/ } });
  await Payment.deleteMany({ description: { $regex: /^PHD_/ } });
  await Notification.deleteMany({ title: { $regex: /^PHD_/ } });
};

let passed = 0;
let failed = 0;

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

async function runPhaseDTests() {
  console.log('🚀 Initializing Phase D Comprehensive Test Suite...\n');
  try {
    await new Promise((r) => setTimeout(r, 1500));
    server = app.listen(PORT, () => console.log(`✅ Phase D Test Server listening on port :${PORT}`));

    await clean();

    // ── Setup Fixtures ──────────────────────────────────────────────────────────
    // Institution 1 (Approved)
    const inst1 = await Institution.create({
      name: 'PHD Alpha University',
      institution_type: 'University',
      code: 'PHDTEST1',
      contact_email: 'alpha@phdtest.com',
      contact_phone: '1111111111',
      address: 'Campus A',
      status: 'Approved',
      admin_details: { full_name: 'Alpha Admin', email: 'admin@phdtest.com' },
    });

    // Institution 2 (Approved, for cross-tenant barrier verification)
    const inst2 = await Institution.create({
      name: 'PHD Beta College',
      institution_type: 'College',
      code: 'PHDTEST2',
      contact_email: 'beta@phdtest.com',
      contact_phone: '2222222222',
      address: 'Campus B',
      status: 'Approved',
      admin_details: { full_name: 'Beta Admin', email: 'beta_admin@phdtest.com' },
    });

    // Hostels in Inst 1 (Hostel A and Hostel B)
    const hostelA = await Hostel.create({
      institution: inst1._id,
      name: 'PHD_Hostel Alpha Block 1',
      type: 'Boys',
      block_number: 'H-A',
      gps_latitude: 28.6139,
      gps_longitude: 77.2090,
      gps_radius: 200, // 200m geofence
    });

    const hostelB = await Hostel.create({
      institution: inst1._id,
      name: 'PHD_Hostel Alpha Block 2',
      type: 'Boys',
      block_number: 'H-B',
      gps_latitude: 28.6200,
      gps_longitude: 77.2100,
      gps_radius: 200,
    });

    // Hostel in Inst 2
    const hostelBeta = await Hostel.create({
      institution: inst2._id,
      name: 'PHD_Hostel Beta Main',
      type: 'Boys',
      block_number: 'HB-1',
    });

    // Rooms in Hostel A: Room 101 (Double, 2 beds), Room 102 (Single, 1 bed)
    const roomA1 = await Room.create({
      institution: inst1._id,
      hostel: hostelA._id,
      room_number: 'PHD-101',
      room_type: 'Double',
      total_beds: 2,
      available_beds: 2,
    });

    const roomA2 = await Room.create({
      institution: inst1._id,
      hostel: hostelA._id,
      room_number: 'PHD-102',
      room_type: 'Single',
      total_beds: 1,
      available_beds: 1,
    });

    // Room in Hostel Beta
    const roomBeta = await Room.create({
      institution: inst2._id,
      hostel: hostelBeta._id,
      room_number: 'PHD-B101',
      room_type: 'Single',
      total_beds: 1,
      available_beds: 1,
    });

    // Wardens
    const wardenA = await Warden.create({
      institution: inst1._id,
      full_name: 'Warden Alpha',
      email: 'warden_a@phdtest.com',
      password: 'Password123!',
      phone: '9999999901',
      hostel: hostelA._id,
    });

    const wardenB = await Warden.create({
      institution: inst1._id,
      full_name: 'Warden Bravo',
      email: 'warden_b@phdtest.com',
      password: 'Password123!',
      phone: '9999999902',
      hostel: hostelB._id,
    });

    const wardenBeta = await Warden.create({
      institution: inst2._id,
      full_name: 'Warden Beta',
      email: 'warden_beta@phdtest.com',
      password: 'Password123!',
      phone: '9999999903',
      hostel: hostelBeta._id,
    });

    // Students
    const student1 = await Student.create({
      institution: inst1._id,
      full_name: 'Student One',
      email: 'student1@phdtest.com',
      roll_number: 'PHD001',
      department: 'CS',
      phone: '8888888801',
      password: 'Password123!',
      is_approved: true,
      is_email_verified: true,
      hostel: hostelA._id,
      room: roomA1._id,
    });
    // Occupy 1 bed in Room A1 for Student 1
    roomA1.available_beds = 1;
    await roomA1.save();

    const student2 = await Student.create({
      institution: inst1._id,
      full_name: 'Student Two',
      email: 'student2@phdtest.com',
      roll_number: 'PHD002',
      department: 'EE',
      phone: '8888888802',
      password: 'Password123!',
      is_approved: true,
      is_email_verified: true,
      hostel: hostelA._id,
    });

    const studentBeta = await Student.create({
      institution: inst2._id,
      full_name: 'Student Beta',
      email: 'student_beta@phdtest.com',
      roll_number: 'PHDB001',
      department: 'ME',
      phone: '8888888803',
      password: 'Password123!',
      is_approved: true,
      is_email_verified: true,
      hostel: hostelBeta._id,
    });

    // Tokens
    const tokenWardenA = generateToken(wardenA._id, 'warden', { institution: inst1._id });
    const tokenWardenB = generateToken(wardenB._id, 'warden', { institution: inst1._id });
    const tokenWardenBeta = generateToken(wardenBeta._id, 'warden', { institution: inst2._id });
    const tokenStudent1 = generateToken(student1._id, 'student', { institution: inst1._id });
    const tokenStudent2 = generateToken(student2._id, 'student', { institution: inst1._id });
    const tokenStudentBeta = generateToken(studentBeta._id, 'student', { institution: inst2._id });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 1: Security & Multi-Tenant Foundation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('─── Part 1: Multi-Tenant Foundation & Role Security ───');

    await test('Student login does not return password hash', async () => {
      const r = await req('POST', '/auth/login', { email: 'student1@phdtest.com', password: 'Password123!', user_type: 'student' });
      if (!r.data.success) throw new Error('Login failed: ' + r.data.message);
      if (r.data.user.password !== undefined) throw new Error('Password hash leaked in login response');
    });

    await test('Warden cannot access another institution data (cross-tenant 404/403)', async () => {
      // Warden A tries to view Beta's rooms
      const r = await req('GET', `/warden/rooms`, null, tokenWardenBeta);
      if (r.data.rooms.some((rm) => String(rm._id) === String(roomA1._id))) {
        throw new Error('Cross-tenant data leak: Warden Beta can view Hostel A rooms!');
      }
    });

    await test('Student cannot access another student profile or data directly', async () => {
      const r = await req('GET', '/student/profile', null, tokenStudent1);
      if (r.data.student.email !== 'student1@phdtest.com') throw new Error('Wrong profile returned');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 2: Warden Dashboard & Hostel Management
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n─── Part 2: Warden Dashboard & Hostel Operations ───');

    await test('Warden A fetches real stats for assigned Hostel A only', async () => {
      const r = await req('GET', '/warden/stats', null, tokenWardenA);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.stats.hostelName !== 'PHD_Hostel Alpha Block 1') throw new Error('Wrong hostel stats');
      if (r.data.stats.totalRooms !== 2) throw new Error(`Expected 2 rooms in stats, got ${r.data.stats.totalRooms}`);
      if (r.data.stats.totalCapacity !== 3) throw new Error(`Expected capacity 3, got ${r.data.stats.totalCapacity}`);
    });

    await test('Warden A gets students roster for assigned hostel only', async () => {
      const r = await req('GET', '/warden/students', null, tokenWardenA);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.students.length !== 2) throw new Error(`Expected 2 students in hostel A, got ${r.data.students.length}`);
    });

    await test('Warden A cannot delete room with active occupants (safety check)', async () => {
      const r = await req('DELETE', `/warden/rooms/${roomA1._id}`, null, tokenWardenA);
      if (r.status !== 400) throw new Error(`Expected 400 when deleting occupied room, got ${r.status}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 3: Attendance & GPS Geofencing
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n─── Part 3: Attendance & GPS Geofencing ───');

    await test('Student 1 check-in within hostel perimeter is verified as Present', async () => {
      // Coords very close to hostel A (28.6139, 77.2090)
      const r = await req('POST', '/student/attendance/check-in', { latitude: 28.6140, longitude: 77.2091 }, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      if (!r.data.geofenceVerified) throw new Error('Expected geofence to be verified');
      if (r.data.attendance.status !== 'Present') throw new Error(`Expected Present, got ${r.data.attendance.status}`);
    });

    await test('Student 2 check-in far outside hostel perimeter is marked Absent (geofence failed)', async () => {
      // Coords far away (lat 29.0000, lon 78.0000)
      const r = await req('POST', '/student/attendance/check-in', { latitude: 29.0000, longitude: 78.0000 }, tokenStudent2);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.geofenceVerified !== false) throw new Error('Expected geofence verification to fail');
      if (r.data.attendance.status !== 'Absent') throw new Error(`Expected Absent status for out of bounds, got ${r.data.attendance.status}`);
    });

    await test('Warden can fetch attendance roster and manually override student status', async () => {
      const today = new Date().toISOString().split('T')[0];
      const r1 = await req('GET', `/warden/attendance/today?date=${today}`, null, tokenWardenA);
      if (!r1.data.success) throw new Error(r1.data.message);
      if (r1.data.roster.length !== 2) throw new Error(`Expected 2 students in roster, got ${r1.data.roster.length}`);

      // Warden manually updates Student 2 to Present
      const r2 = await req('POST', '/warden/attendance/mark', {
        student_id: student2._id,
        attendance_date: today,
        status: 'Present',
      }, tokenWardenA);
      if (!r2.data.success) throw new Error(r2.data.message);
      if (r2.data.record.status !== 'Present') throw new Error('Warden manual update failed');
      if (r2.data.record.marked_by !== 'warden_manual') throw new Error('Marked by should be warden_manual');
    });

    await test('Student attendance history returns correct records', async () => {
      const r = await req('GET', '/student/attendance', null, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.records.length === 0) throw new Error('No attendance history returned');
      if (!r.data.todayMarked) throw new Error('todayMarked should be true');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 4: Leave Management
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n─── Part 4: Leave Management & Overlap Prevention ───');

    let createdLeaveId;
    await test('Student can submit a valid leave application', async () => {
      const r = await req('POST', '/student/leaves', {
        from_date: '2099-10-01',
        to_date: '2099-10-05',
        reason: 'PHD_Family event in hometown',
      }, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      createdLeaveId = r.data.leave._id;
      if (r.data.leave.status !== 'Pending') throw new Error('Status should be Pending');
    });

    await test('Invalid leave dates (to_date < from_date) are rejected with 400', async () => {
      const r = await req('POST', '/student/leaves', {
        from_date: '2099-10-10',
        to_date: '2099-10-05',
        reason: 'PHD_Invalid test',
      }, tokenStudent1);
      if (r.status !== 400) throw new Error(`Expected 400 for invalid dates, got ${r.status}`);
    });

    await test('Overlapping leave application for the same student is rejected with 400', async () => {
      const r = await req('POST', '/student/leaves', {
        from_date: '2099-10-03',
        to_date: '2099-10-07',
        reason: 'PHD_Overlapping leave',
      }, tokenStudent1);
      if (r.status !== 400) throw new Error(`Expected 400 for overlapping leave, got ${r.status}`);
    });

    await test('Warden A can review and approve leave for Hostel A student', async () => {
      const r = await req('PUT', `/warden/leaves/${createdLeaveId}`, {
        status: 'Approved',
        warden_remarks: 'Parent verified by call',
      }, tokenWardenA);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.leave.status !== 'Approved') throw new Error('Status not Approved');
    });

    await test('Warden B cannot approve leave for Hostel A student (cross-hostel barrier)', async () => {
      // Create another leave for student 1
      const l2 = await LeaveRequest.create({
        institution: inst1._id,
        student: student1._id,
        from_date: '2099-11-01',
        to_date: '2099-11-03',
        reason: 'PHD_Test leave 2',
        status: 'Pending',
      });

      const r = await req('PUT', `/warden/leaves/${l2._id}`, { status: 'Approved' }, tokenWardenB);
      if (r.status !== 404 && r.status !== 403) throw new Error(`Expected 404/403 for cross-hostel leave action, got ${r.status}`);
      await LeaveRequest.findByIdAndDelete(l2._id);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 5: Complaints & In-App Notifications
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n─── Part 5: Complaints & In-App Notifications ───');

    let createdComplaintId;
    await test('Student 1 lodges a complaint with priority and category', async () => {
      const r = await req('POST', '/student/complaints', {
        category: 'Electrical',
        priority: 'High',
        description: 'PHD_Ceiling fan regulator sparking',
      }, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      createdComplaintId = r.data.complaint._id;
      if (r.data.complaint.priority !== 'High') throw new Error('Priority mismatch');
    });

    await test('Warden A updates complaint status and triggers student notification', async () => {
      const r = await req('PUT', `/warden/complaints/${createdComplaintId}`, {
        status: 'In Progress',
        warden_remarks: 'Electrician Ramu assigned for 4 PM',
      }, tokenWardenA);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.complaint.status !== 'In Progress') throw new Error('Status not In Progress');
    });

    await test('Student 1 receives in-app notification for complaint update', async () => {
      const r = await req('GET', '/notifications', null, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      if (r.data.notifications.length === 0) throw new Error('No in-app notifications found');
      const notif = r.data.notifications.find((n) => n.type === 'complaint');
      if (!notif) throw new Error('Complaint notification not found in user inbox');
    });

    await test('Student 1 can mark notification as read', async () => {
      const r1 = await req('GET', '/notifications', null, tokenStudent1);
      const notifId = r1.data.notifications[0]._id;

      const r2 = await req('PUT', `/notifications/${notifId}/read`, null, tokenStudent1);
      if (!r2.data.success) throw new Error(r2.data.message);
      if (!r2.data.notification.is_read) throw new Error('Notification is_read was not set to true');

      const r3 = await req('PUT', '/notifications/read-all', null, tokenStudent1);
      if (!r3.data.success) throw new Error(r3.data.message);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 6: Room Change Requests & Atomic Capacity Management
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n─── Part 6: Room Change Requests & Safe Room Transfers ───');

    let createdRoomReqId;
    await test('Student 1 submits room change request', async () => {
      const r = await req('POST', '/student/room-request', {
        preferred_room_type: 'Single',
        reason: 'PHD_Need quiet single room for study',
      }, tokenStudent1);
      if (!r.data.success) throw new Error(r.data.message);
      createdRoomReqId = r.data.roomReq._id;
      if (r.data.roomReq.status !== 'Pending') throw new Error('Status should be Pending');
    });

    await test('Duplicate pending room request for same student is rejected with 400', async () => {
      const r = await req('POST', '/student/room-request', {
        preferred_room_type: 'Single',
        reason: 'PHD_Duplicate request',
      }, tokenStudent1);
      if (r.status !== 400) throw new Error(`Expected 400 for duplicate pending room request, got ${r.status}`);
    });

    await test('Warden A approves room transfer to Room 102 with atomic bed transfer', async () => {
      // Before transfer:
      // Room 101 (Student 1's old room) available_beds = 1
      // Room 102 (Target room) available_beds = 1
      const room101Before = await Room.findById(roomA1._id);
      const room102Before = await Room.findById(roomA2._id);
      if (room102Before.available_beds !== 1) throw new Error('Target room 102 should have 1 available bed before transfer');

      const r = await req('PUT', `/warden/room-requests/${createdRoomReqId}`, {
        status: 'Approved',
        room_id: roomA2._id,
        remarks: 'Transferred to single room 102',
      }, tokenWardenA);

      if (!r.data.success) throw new Error('Room transfer approval failed: ' + r.data.message);

      // After transfer:
      // Room 101 (old room) bed freed -> available_beds = 2
      // Room 102 (new room) bed occupied -> available_beds = 0
      // Student 1's room -> Room 102
      const room101After = await Room.findById(roomA1._id);
      const room102After = await Room.findById(roomA2._id);
      const studentAfter = await Student.findById(student1._id);

      if (room101After.available_beds !== 2) {
        throw new Error(`Expected old room 101 available_beds to increase to 2, got ${room101After.available_beds}`);
      }
      if (room102After.available_beds !== 0) {
        throw new Error(`Expected new room 102 available_beds to decrease to 0, got ${room102After.available_beds}`);
      }
      if (String(studentAfter.room) !== String(roomA2._id)) {
        throw new Error(`Student room not updated to room 102`);
      }
    });

    await test('Allocating a fully occupied room is blocked with 400 (overbooking prevention)', async () => {
      // Room 102 now has 0 available beds
      // Create request for Student 2
      const req2 = await RoomRequest.create({
        institution: inst1._id,
        hostel: hostelA._id,
        student: student2._id,
        preferred_room_type: 'Single',
        reason: 'PHD_Try overbook',
        status: 'Pending',
      });

      const r = await req('PUT', `/warden/room-requests/${req2._id}`, {
        status: 'Approved',
        room_id: roomA2._id, // Room 102 has 0 beds
      }, tokenWardenA);

      if (r.status !== 400) throw new Error(`Expected 400 when assigning fully occupied room, got ${r.status}`);
      await RoomRequest.findByIdAndDelete(req2._id);
    });

    await test('Cross-tenant room transfer is blocked with 404', async () => {
      // Warden Beta tries to assign Alpha's room to Beta student
      const betaReq = await RoomRequest.create({
        institution: inst2._id,
        hostel: hostelBeta._id,
        student: studentBeta._id,
        preferred_room_type: 'Single',
        reason: 'PHD_Cross tenant hack',
        status: 'Pending',
      });

      const r = await req('PUT', `/warden/room-requests/${betaReq._id}`, {
        status: 'Approved',
        room_id: roomA1._id, // Belongs to Inst 1
      }, tokenWardenBeta);

      if (r.status !== 404) throw new Error(`Expected 404 for cross-tenant room transfer, got ${r.status}`);
      await RoomRequest.findByIdAndDelete(betaReq._id);
    });

    console.log(`\n${'─'.repeat(55)}`);
    console.log(`🏁 Phase D Test Suite Completed: ${passed} Passed, ${failed} Failed`);
    console.log(`${'─'.repeat(55)}\n`);
    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exitCode = 1;
  } finally {
    await clean();
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(process.exitCode || 0);
  }
}

runPhaseDTests();
