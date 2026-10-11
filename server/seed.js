import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import Institution from './models/Institution.js';
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
import SosAlert from './models/SosAlert.js';
import SystemLog from './models/SystemLog.js';
import Notice from './models/Notice.js';
import Notification from './models/Notification.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campushome';

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // Clear existing collections
    console.log('🧹 Clearing existing collections...');
    await Institution.deleteMany();
    await Admin.deleteMany();
    await Hostel.deleteMany();
    await Warden.deleteMany();
    await Student.deleteMany();
    await Room.deleteMany();
    await AttendanceSession.deleteMany();
    await Attendance.deleteMany();
    await LeaveRequest.deleteMany();
    await Complaint.deleteMany();
    await Payment.deleteMany();
    await MessMenu.deleteMany();
    await SosAlert.deleteMany();
    await SystemLog.deleteMany();
    await Notice.deleteMany();
    await Notification.deleteMany();

    // 1. Create Super Admin
    console.log('👑 Creating Super Admin user...');
    const superAdmin = await Admin.create({
      username: 'superadmin',
      email: 'superadmin@campushome.com',
      password: 'adminpassword123',
      full_name: 'CampusHome Platform Super Admin',
      role: 'super_admin',
    });
    console.log(`  ✅ Super Admin created: ${superAdmin.email}`);

    // 2. Create Approved Institution
    console.log('🏫 Creating Primary Institution...');
    const institution = await Institution.create({
      name: 'Delhi Technological University',
      slug: 'dtu-delhi',
      institution_type: 'University',
      code: 'DTU01',
      contact_email: 'contact@dtu.ac.in',
      contact_phone: '+91 11 27871018',
      address: 'Shahbad Daulatpur, Main Bawana Road, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      status: 'Approved',
      subscription_plan: 'Enterprise',
      admin_details: {
        full_name: 'Dr. Rajesh Sharma',
        email: 'admin@campushome.com',
        phone: '+91 9876543210',
        designation: 'Chief Hostel Administrator',
      },
      approved_at: new Date(),
      approved_by: superAdmin._id,
    });
    console.log(`  ✅ Institution created: ${institution.name} (${institution.code})`);

    // 3. Create Institution Admin
    console.log('👤 Creating Institution Admin user...');
    const instAdmin = await Admin.create({
      username: 'admin',
      email: 'admin@campushome.com',
      password: 'adminpassword123',
      full_name: 'Dr. Rajesh Sharma (Chief Warden / Admin)',
      role: 'institution_admin',
      institution: institution._id,
    });
    console.log(`  ✅ Institution Admin created: ${instAdmin.email}`);

    // 4. Create Hostels
    console.log('🏢 Creating Hostels...');
    const hostelA = await Hostel.create({
      institution: institution._id,
      name: 'Bhagat Singh Boys Hostel',
      type: 'Boys',
      block_number: 'Block-A',
      address: 'North Campus, Engineering Block Road',
      contact_number: '+91 9876543210',
      gps_latitude: 28.7501,
      gps_longitude: 77.1177,
      gps_radius: 300,
    });

    const hostelB = await Hostel.create({
      institution: institution._id,
      name: 'Kalpana Chawla Girls Hostel',
      type: 'Girls',
      block_number: 'Block-B',
      address: 'South Campus, Academic Square',
      contact_number: '+91 9876543211',
      gps_latitude: 28.7510,
      gps_longitude: 77.1185,
      gps_radius: 300,
    });

    // 5. Create Wardens
    console.log('👮 Creating Wardens...');
    const warden1 = await Warden.create({
      institution: institution._id,
      full_name: 'Prof. Vikram Malhotra',
      email: 'warden@campushome.com',
      password: 'wardenpassword123',
      phone: '+91 9811223344',
      hostel: hostelA._id,
      address: 'Warden Quarter 1, Block-A',
    });

    const warden2 = await Warden.create({
      institution: institution._id,
      full_name: 'Dr. Sunita Kapoor',
      email: 'warden.girls@campushome.com',
      password: 'wardenpassword123',
      phone: '+91 9822334455',
      hostel: hostelB._id,
      address: 'Warden Quarter 2, Block-B',
    });

    // 6. Create Rooms
    console.log('🛏️ Creating Rooms...');
    const roomA101 = await Room.create({
      institution: institution._id,
      hostel: hostelA._id,
      room_number: 'A-101',
      room_type: 'Double',
      total_beds: 2,
      available_beds: 0,
    });

    const roomA102 = await Room.create({
      institution: institution._id,
      hostel: hostelA._id,
      room_number: 'A-102',
      room_type: 'Triple',
      total_beds: 3,
      available_beds: 2,
    });

    const roomB201 = await Room.create({
      institution: institution._id,
      hostel: hostelB._id,
      room_number: 'B-201',
      room_type: 'Double',
      total_beds: 2,
      available_beds: 1,
    });

    // 7. Create Students
    console.log('🎓 Creating Students...');
    const student1 = await Student.create({
      institution: institution._id,
      full_name: 'Aarav Sharma',
      email: 'student@campushome.com',
      roll_number: '2023CSE042',
      drcc_id: 'DRCC-98214',
      department: 'Computer Science & Engineering',
      phone: '+91 9988776655',
      password: 'studentpassword123',
      parent_name: 'Sanjay Sharma',
      parent_phone: '+91 9871122334',
      address: 'Flat 402, Green Avenue, Delhi',
      emergency_contact: '+91 9871122334',
      is_approved: true,
      hostel: hostelA._id,
      room: roomA101._id,
    });

    const student2 = await Student.create({
      institution: institution._id,
      full_name: 'Rohan Verma',
      email: 'rohan.verma@campushome.com',
      roll_number: '2023CSE045',
      drcc_id: 'DRCC-98215',
      department: 'Computer Science & Engineering',
      phone: '+91 9988776656',
      password: 'studentpassword123',
      parent_name: 'Anil Verma',
      parent_phone: '+91 9871122335',
      address: 'Sector 15, Chandigarh',
      emergency_contact: '+91 9871122335',
      is_approved: true,
      hostel: hostelA._id,
      room: roomA101._id,
    });

    const student3 = await Student.create({
      institution: institution._id,
      full_name: 'Ananya Gupta',
      email: 'ananya.gupta@campushome.com',
      roll_number: '2023ECE018',
      drcc_id: 'DRCC-98219',
      department: 'Electronics & Communication',
      phone: '+91 9988776657',
      password: 'studentpassword123',
      parent_name: 'Manish Gupta',
      parent_phone: '+91 9871122336',
      address: 'Civil Lines, Amritsar',
      emergency_contact: '+91 9871122336',
      is_approved: true,
      hostel: hostelB._id,
      room: roomB201._id,
    });

    // 8. Attendance Session & Records
    console.log('📅 Creating Attendance Data...');
    const today = new Date().toISOString().split('T')[0];
    const sessionA = await AttendanceSession.create({
      institution: institution._id,
      hostel: hostelA._id,
      session_date: today,
      is_active: true,
    });

    await Attendance.create({
      institution: institution._id,
      student: student1._id,
      session: sessionA._id,
      attendance_date: today,
      status: 'Present',
      marked_by: 'self_gps',
      gps_location: {
        latitude: 28.7502,
        longitude: 77.1178,
        distance_meters: 15,
        is_within_radius: true,
      },
    });

    await Attendance.create({
      institution: institution._id,
      student: student2._id,
      session: sessionA._id,
      attendance_date: today,
      status: 'Present',
      marked_by: 'warden_manual',
    });

    // 9. Complaints
    console.log('🔧 Creating Complaints...');
    await Complaint.create({
      institution: institution._id,
      hostel: hostelA._id,
      student: student1._id,
      category: 'Electrical',
      description: 'The ceiling fan in Room A-101 makes high screeching noise at regulator speed 3 and 4.',
      priority: 'Medium',
      status: 'In Progress',
      warden_remarks: 'Electrician assigned. Expected completion today by 4 PM.',
    });

    await Complaint.create({
      institution: institution._id,
      hostel: hostelA._id,
      student: student2._id,
      category: 'Internet/WiFi',
      description: 'WiFi access point on 1st floor corridor is dropping connection intermittently.',
      priority: 'High',
      status: 'Pending',
      warden_remarks: '',
    });

    // 10. Leave Requests
    console.log('📝 Creating Leave Requests...');
    await LeaveRequest.create({
      institution: institution._id,
      hostel: hostelA._id,
      student: student1._id,
      from_date: '2026-10-05',
      to_date: '2026-10-08',
      reason: 'Attending family wedding ceremony in hometown.',
      status: 'Approved',
      warden_remarks: 'Approved. Parent consent verified via phone call.',
      action_by: warden1._id,
    });

    await LeaveRequest.create({
      institution: institution._id,
      hostel: hostelA._id,
      student: student2._id,
      from_date: '2026-10-12',
      to_date: '2026-10-14',
      reason: 'Medical checkup and dental appointment.',
      status: 'Pending',
      warden_remarks: '',
    });

    // 11. Payments & Fines
    console.log('💳 Creating Payments...');
    await Payment.create({
      institution: institution._id,
      student: student1._id,
      amount: 15000,
      fine_type: 'Hostel Fee',
      description: 'Semester 5 Hostel Accommodation & Maintenance Fee',
      status: 'Paid',
      transaction_id: 'TXN-HOSTEL-994821',
      payment_date: new Date(),
    });

    await Payment.create({
      institution: institution._id,
      student: student1._id,
      amount: 250,
      fine_type: 'Late Entry',
      description: 'Late gate check-in after 10:30 PM',
      status: 'Pending',
    });

    // 12. Mess Menu
    console.log('🍲 Creating Mess Menus...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await MessMenu.create({
        institution: institution._id,
        hostel: hostelA._id,
        day_of_week: day,
        meal_type: 'Breakfast',
        menu_item: 'Puri Bhaji / Poha / Idli Sambar, Tea & Coffee, Banana',
      });
      await MessMenu.create({
        institution: institution._id,
        hostel: hostelA._id,
        day_of_week: day,
        meal_type: 'Lunch',
        menu_item: 'Dal Makhani, Rice, Paneer Curry, Seasonal Veg, Salad, Roti',
      });
      await MessMenu.create({
        institution: institution._id,
        hostel: hostelA._id,
        day_of_week: day,
        meal_type: 'Dinner',
        menu_item: 'Special Thali / Curry, Jeera Rice, Tandoori Roti, Sweet Dish',
      });
    }

    // 13. Notices
    console.log('📢 Creating Campus Notices...');
    await Notice.create({
      institution: institution._id,
      title: 'Hostel Curfew & Gate Timings strictly enforced from 10:00 PM',
      content: 'All residents are advised that main hostel gates will be locked at 10:00 PM sharp. Late entry fines of ₹250 will be auto-levied for unapproved late arrivals.',
      category: 'Rules & Timings',
      posted_by: 'Chief Warden Office',
      is_pinned: true,
    });

    // 14. Notifications
    console.log('🔔 Creating In-App Notifications...');
    await Notification.create({
      recipient_id: student1._id,
      recipient_role: 'student',
      institution: institution._id,
      title: 'Leave Application Approved',
      message: 'Your leave application from 2026-10-05 to 2026-10-08 has been approved by Prof. Vikram Malhotra.',
      type: 'leave',
      is_read: false,
    });

    await Notification.create({
      recipient_id: student1._id,
      recipient_role: 'student',
      institution: institution._id,
      title: 'Complaint Update',
      message: 'Your electrical complaint regarding Room A-101 fan is now In Progress.',
      type: 'complaint',
      is_read: false,
    });

    console.log('\n========================================================');
    console.log('🎉 MULTI-TENANT SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
};

seedDatabase();
