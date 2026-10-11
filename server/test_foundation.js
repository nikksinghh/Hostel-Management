import dotenv from 'dotenv';
dotenv.config();

import Admin from './models/Admin.js';
import Hostel from './models/Hostel.js';
import Warden from './models/Warden.js';
import Student from './models/Student.js';
import Room from './models/Room.js';
import AttendanceSession from './models/AttendanceSession.js';
import Attendance from './models/Attendance.js';
import LeaveRequest from './models/LeaveRequest.js';
import Complaint from './models/Complaint.js';
import Payment from './models/Payment.js';
import MessMenu from './models/MessMenu.js';
import InventoryChecklist from './models/InventoryChecklist.js';
import SosAlert from './models/SosAlert.js';
import SystemLog from './models/SystemLog.js';
import RoomRequest from './models/RoomRequest.js';
import { generateToken } from './middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function runTests() {
  console.log('🧪 [Test 1]: Checking all 15 Mongoose Models compilation...');
  const models = [
    { name: 'Admin', model: Admin },
    { name: 'Hostel', model: Hostel },
    { name: 'Warden', model: Warden },
    { name: 'Student', model: Student },
    { name: 'Room', model: Room },
    { name: 'AttendanceSession', model: AttendanceSession },
    { name: 'Attendance', model: Attendance },
    { name: 'LeaveRequest', model: LeaveRequest },
    { name: 'Complaint', model: Complaint },
    { name: 'Payment', model: Payment },
    { name: 'MessMenu', model: MessMenu },
    { name: 'InventoryChecklist', model: InventoryChecklist },
    { name: 'SosAlert', model: SosAlert },
    { name: 'SystemLog', model: SystemLog },
    { name: 'RoomRequest', model: RoomRequest },
  ];

  models.forEach((m) => {
    if (!m.model || !m.model.modelName) {
      throw new Error(`Model ${m.name} failed to compile!`);
    }
    console.log(`  ✅ Model '${m.model.modelName}' compiled successfully`);
  });

  console.log('\n🧪 [Test 2]: Testing Bcrypt Password Hashing & Verification...');
  const plainPassword = 'AdminPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPassword, salt);
  const isMatch = await bcrypt.compare(plainPassword, hash);
  const isWrongMatch = await bcrypt.compare('WrongPassword', hash);

  if (!isMatch || isWrongMatch) {
    throw new Error('Bcrypt password verification failed!');
  }
  console.log('  ✅ Bcrypt hashing and comparison functioning correctly');

  console.log('\n🧪 [Test 3]: Testing JWT Token Generation and Decoding...');
  const fakeId = '654321654321654321654321';
  const token = generateToken(fakeId, 'admin');
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campushome_jwt_secret_dev_key_2026_secure');

  if (decoded.id !== fakeId || decoded.role !== 'admin') {
    throw new Error('JWT generation or verification failed!');
  }
  console.log('  ✅ JWT Token generated & decoded successfully (Role: ' + decoded.role + ')');

  console.log('\n🎉 ALL FOUNDATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
