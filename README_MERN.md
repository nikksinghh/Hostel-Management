# 🏢 CampusHome - Next-Gen Hostel Management System (MERN Stack)

A modern, full-stack, enterprise-grade Hostel Management System built with **Node.js, Express, MongoDB (Mongoose), and React + Vite** with rich glassmorphism UI, GPS geofenced attendance, 1-click emergency SOS broadcasts, and role-based workflows for Administrators, Wardens, and Students.

---

## 🌟 Key System Features

### 👑 1. Super Admin Portal
- **Executive Analytics Overview**: Total residents, occupancy rates, collected fees vs dues, open complaints, pending leave approvals, active emergency alerts.
- **Hostel Blocks Management**: Add/Edit/Delete hostel buildings, configure capacity, assign wardens, and configure GPS geofence coordinates & radius.
- **Warden Supervision & Registry**: Provision warden credentials and allocate block management duties.
- **Student Admissions & Registry**: Approve newly registered students, allocate rooms, filter by department/hostel, and manage records.
- **Room Transfer Workflows**: Process resident room change applications.
- **System Audit & Security Logs**: Live chronological activity log of all logins and administrative actions.

### 👮 2. Hostel Warden Portal
- **Hostel Overview Stats**: Live student counts, today's attendance summary, pending leaves, and active grievances.
- **Daily Attendance Roster**: Date-picker attendance grid with 1-click quick toggles (Present / Absent / Leave) and GPS verification badge.
- **Leave Request Management**: Review student outstation and medical leaves with parental consent remarks.
- **Maintenance & Grievances**: Track electrical, plumbing, carpentry, and WiFi tickets, and resolve with technician notes.
- **Rooms & Bed Matrix**: Monitor room-by-room bed occupancies, vacant spots, and resident roommate lists.
- **🚨 Real-Time SOS Emergency Center**: Immediate alerts with student room numbers and emergency contacts.
- **Weekly Mess Planner**: Schedule Breakfast, Lunch, Snacks, and Dinner menus from Monday to Sunday.
- **Issue Fine / Fee Invoices**: Issue late-entry or property damage penalties to students.

### 🎓 3. Resident Student Portal
- **Student Profile & Room Info**: View allocated hostel, room number, roommate contact cards, and attendance rate indicator.
- **🚨 1-Click SOS Distress Trigger**: Instant emergency beacon notifying warden and security with room coordinates.
- **Smart GPS Geofenced Attendance**: Self check-in verified against the hostel building coordinates.
- **Outstation / Medical Leaves**: Submit leave applications with dates and reasons, and track live approval status.
- **Complaint Center**: Lodge maintenance issues (Electrical, Plumbing, WiFi, Mess, Cleanliness) with status timeline.
- **Daily & Weekly Mess Menu**: View daily meals and special items.
- **Fees & Invoices**: View pending dues and pay online with instant simulated transaction receipt generation.
- **Room Transfer Requests**: Apply for single/double room changes.

---

## 🔑 Demo Login Credentials

You can use the 1-click demo buttons on the login page, or use these credentials:

| Role | Email / Username | Password | Assigned Area |
|---|---|---|---|
| **Admin** | `admin@campushome.com` (or `admin`) | `adminpassword123` | Master Super Admin |
| **Warden (Boys)** | `warden@campushome.com` | `wardenpassword123` | Bhagat Singh Boys Hostel |
| **Warden (Girls)** | `warden.girls@campushome.com` | `wardenpassword123` | Kalpana Chawla Girls Hostel |
| **Student** | `student@campushome.com` | `studentpassword123` | Aarav Sharma (Room A-101) |

---

## 🚀 How to Run Locally

### 1. Database Seeding (Optional)
To populate demo hostels, wardens, students, rooms, menus, and complaints:
```bash
cd server
npm run seed
```

### 2. Start Backend Server
```bash
cd server
npm run dev
# Server runs on: http://localhost:5000
```

### 3. Start Frontend Client
```bash
cd client
npm run dev
# Frontend runs on: http://localhost:5173
```

---

## 🛠️ Technology Stack
- **Frontend**: React 19, Vite, Lucide Icons, React Router v7, Axios, Custom Glassmorphic Design System
- **Backend**: Node.js, Express.js (ES Modules), JWT Authentication, Bcrypt.js, Multer
- **Database**: MongoDB with Mongoose ODM (15 Schemas)
