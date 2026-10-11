import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import Admin from './models/Admin.js';
import Institution from './models/Institution.js';
import Hostel from './models/Hostel.js';
import Room from './models/Room.js';
import Warden from './models/Warden.js';
import Student from './models/Student.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campushome';

async function seedVerificationData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for verification setup.');

  // Clean existing verification fixtures
  await Admin.deleteMany({ email: { $in: [
    'superadmin@campushome.com',
    'apex_admin@apex.edu',
    'zenith_admin@zenith.edu',
    'pending_admin@pending.edu',
    'rejected_admin@rejected.edu',
    'suspended_admin@suspended.edu'
  ] } });
  await Institution.deleteMany({ code: { $in: ['APEX01', 'ZENITH01', 'PEND01', 'REJ01', 'SUSP01'] } });
  await Warden.deleteMany({ email: 'apex_warden@apex.edu' });
  await Student.deleteMany({ email: { $in: ['apex_student@apex.edu', 'new_student@apex.edu'] } });
  await Hostel.deleteMany({ name: { $in: ['Apex Pioneer Hostel', 'Zenith Royal Hostel'] } });

  // 1. Super Admin
  const superAdmin = await Admin.create({
    username: 'superadmin',
    email: 'superadmin@campushome.com',
    password: 'SuperAdmin123!',
    full_name: 'Platform Super Administrator',
    role: 'super_admin'
  });
  console.log('✅ Super Admin created');

  // 2. Approved Institution: Apex
  const instApex = await Institution.create({
    name: 'Apex Global University',
    institution_type: 'University',
    code: 'APEX01',
    contact_email: 'contact@apex.edu',
    contact_phone: '9876543210',
    address: '100 Innovation Way, Metro City',
    status: 'Approved',
    admin_details: { full_name: 'Apex Admin', email: 'apex_admin@apex.edu' }
  });

  const adminApex = await Admin.create({
    username: 'apex_admin',
    email: 'apex_admin@apex.edu',
    password: 'ApexAdmin123!',
    full_name: 'Apex Admin',
    role: 'institution_admin',
    institution: instApex._id
  });
  console.log('✅ Apex Approved Institution + Admin created');

  // 3. Approved Institution: Zenith (for cross-tenant testing)
  const instZenith = await Institution.create({
    name: 'Zenith Institute of Tech',
    institution_type: 'College',
    code: 'ZENITH01',
    contact_email: 'contact@zenith.edu',
    contact_phone: '9876543211',
    address: '200 Science Ave, Tech City',
    status: 'Approved',
    admin_details: { full_name: 'Zenith Admin', email: 'zenith_admin@zenith.edu' }
  });

  const adminZenith = await Admin.create({
    username: 'zenith_admin',
    email: 'zenith_admin@zenith.edu',
    password: 'ZenithAdmin123!',
    full_name: 'Zenith Admin',
    role: 'institution_admin',
    institution: instZenith._id
  });

  const zenithHostel = await Hostel.create({
    institution: instZenith._id,
    name: 'Zenith Royal Hostel',
    type: 'Boys',
    block_number: 'ZR-1',
    address: 'Zenith Campus',
    contact_number: '9876543211'
  });

  const zenithRoom = await Room.create({
    institution: instZenith._id,
    hostel: zenithHostel._id,
    room_number: 'Z-101',
    room_type: 'Single',
    total_beds: 1,
    available_beds: 1
  });
  console.log('✅ Zenith Approved Institution + Hostel + Room created');

  // 4. Pending Institution
  const instPending = await Institution.create({
    name: 'Pending Heights College',
    institution_type: 'College',
    code: 'PEND01',
    contact_email: 'contact@pending.edu',
    contact_phone: '9876543212',
    address: '300 Valley Rd',
    status: 'Pending',
    admin_details: { full_name: 'Pending Admin', email: 'pending_admin@pending.edu' }
  });

  const adminPending = await Admin.create({
    username: 'pending_admin',
    email: 'pending_admin@pending.edu',
    password: 'PendingAdmin123!',
    full_name: 'Pending Admin',
    role: 'institution_admin',
    institution: instPending._id
  });
  console.log('✅ Pending Institution + Admin created');

  // 5. Rejected Institution
  const instRejected = await Institution.create({
    name: 'Rejected Academy',
    institution_type: 'School',
    code: 'REJ01',
    contact_email: 'contact@rejected.edu',
    contact_phone: '9876543213',
    address: '400 Ridge Rd',
    status: 'Rejected',
    admin_details: { full_name: 'Rejected Admin', email: 'rejected_admin@rejected.edu' }
  });

  const adminRejected = await Admin.create({
    username: 'rejected_admin',
    email: 'rejected_admin@rejected.edu',
    password: 'RejectedAdmin123!',
    full_name: 'Rejected Admin',
    role: 'institution_admin',
    institution: instRejected._id
  });
  console.log('✅ Rejected Institution + Admin created');

  // 6. Suspended Institution
  const instSuspended = await Institution.create({
    name: 'Suspended Polytechnic',
    institution_type: 'Polytechnic',
    code: 'SUSP01',
    contact_email: 'contact@suspended.edu',
    contact_phone: '9876543214',
    address: '500 Hill Rd',
    status: 'Suspended',
    admin_details: { full_name: 'Suspended Admin', email: 'suspended_admin@suspended.edu' }
  });

  const adminSuspended = await Admin.create({
    username: 'suspended_admin',
    email: 'suspended_admin@suspended.edu',
    password: 'SuspendedAdmin123!',
    full_name: 'Suspended Admin',
    role: 'institution_admin',
    institution: instSuspended._id
  });
  console.log('✅ Suspended Institution + Admin created');

  // 7. Apex Hostel & Warden
  const apexHostel = await Hostel.create({
    institution: instApex._id,
    name: 'Apex Pioneer Hostel',
    type: 'Boys',
    block_number: 'AP-1',
    address: 'Apex Campus North',
    contact_number: '9876543210'
  });

  const apexWarden = await Warden.create({
    institution: instApex._id,
    full_name: 'Apex Warden',
    email: 'apex_warden@apex.edu',
    password: 'Warden123!',
    phone: '9876543299',
    hostel: apexHostel._id,
    address: 'Staff Quarters Apex'
  });
  console.log('✅ Apex Warden created');

  // 8. Apex Students (Approved and Pending)
  const apexStudent = await Student.create({
    institution: instApex._id,
    full_name: 'Apex Approved Student',
    email: 'apex_student@apex.edu',
    roll_number: 'APEX2026-001',
    drcc_id: 'DRCC-APEX-01',
    department: 'Computer Science',
    phone: '9876543288',
    password: 'Student123!',
    is_approved: true,
    hostel: apexHostel._id
  });

  const newStudent = await Student.create({
    institution: instApex._id,
    full_name: 'Apex New Student',
    email: 'new_student@apex.edu',
    roll_number: 'APEX2026-002',
    drcc_id: 'DRCC-APEX-02',
    department: 'Mechanical Engineering',
    phone: '9876543277',
    password: 'Student123!',
    is_approved: false
  });
  console.log('✅ Apex Students created');

  await mongoose.connection.close();
  console.log('All verification fixtures seeded successfully!');
}

seedVerificationData().catch(err => {
  console.error(err);
  process.exit(1);
});
