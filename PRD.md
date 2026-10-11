# 📋 Product Requirements Document (PRD)

## Project: CampusHome - Next-Gen Smart Hostel Management System
**Version:** 1.0.0  
**Stack:** MERN (MongoDB, Express.js, React 19, Node.js)  
**Status:** Active / Production-Ready Foundation  

---

## 1. Executive Summary & Vision

### 1.1 What We Are Building
**CampusHome** is an enterprise-grade, multi-tenant digital hostel management ecosystem designed for higher-education campuses, boarding institutions, and multi-hostel residential complexes. It replaces fragmented paper registers, disparate spreadsheets, and slow physical grievance channels with a unified, real-time portal.

### 1.2 Why We Are Building It (Problem Statement)
Traditional hostel administration faces acute pain points:
1. **Safety Vulnerabilities & Slow Emergency Response**: When residents face medical emergencies or security threats, notifying wardens and campus security takes precious minutes.
2. **Attendance Fraud & Proxy Issues**: Paper roll-calls are labor-intensive, error-prone, and prone to proxy sign-ins.
3. **Delayed Grievance & Maintenance Resolution**: Unmonitored paper complaint registers lead to delayed repairs in electrical, plumbing, carpentry, and internet facilities.
4. **Disjointed Leave & Outstation Tracking**: Students frequently leave campus without auditable records or verified permissions.
5. **Fee Tracking & Fine Leakage**: Dues, damage penalties, and mess payments often slip through untracked spreadsheets.
6. **Multi-Institution Inflexibility**: Educational chains running multiple universities or campuses lack a centralized platform with strict tenant isolation.

---

## 2. Target Personas & User Roles

| Persona | Role Key | Primary Responsibilities & Goals |
|---|---|---|
| **Super Admin** | `super_admin` | Global platform overseer. Onboards institutions, monitors system-wide platform health, oversees tenant allocations, and manages global compliance. |
| **Institution Admin** | `institution_admin` / `admin` | Campus administrator. Manages hostel buildings, assigns wardens, approves student admissions, oversees room transfers, monitors revenue/fines, and inspects audit logs. |
| **Hostel Warden** | `warden` | Building authority. Conducts roll-calls, verifies geofenced check-ins, approves/rejects leaves, resolves maintenance tickets, monitors bed matrix, and manages mess menus. |
| **Resident Student** | `student` | Inhabitant. Marks GPS-verified attendance, accesses 1-click SOS beacon, logs maintenance issues, applies for leave/room changes, views mess menu, and pays fees. |

---

## 3. Core Functional Requirements

### 3.1 Multi-Tenant Organization Architecture
- Support isolated institutions (universities, colleges, or boarding academies).
- Strict data segmentation: every student, warden, hostel, and record belongs to an `institutionId`.
- Super Admin portal to create, configure, suspend, or activate institution licenses.

### 3.2 GPS Geofenced Attendance System
- Students initiate self check-in via mobile/laptop browser.
- Real-time geolocation check matches browser coordinates against hostel latitude/longitude within a configurable geofence radius (e.g., 150m).
- Wardens have a live attendance grid with 1-click status overrides (Present, Absent, On Leave).
- Historical attendance tracking with automated resident attendance percentages.

### 3.3 1-Click SOS Emergency Distress Center
- Instant distress trigger accessible from the student dashboard and mobile viewport.
- Transmits immediate high-priority beacon containing:
  - Student identity, phone, room number, hostel wing
  - Precise timestamp and status (`active` / `resolved`)
- Audible & visual glowing beacon displayed on warden and admin dashboards.
- Emergency contact auto-dialing links and incident resolution logging.

### 3.4 Outstation & Medical Leave Workflow
- Student submits leave request with type (Medical, Outstation, Casual), departure/return dates, and reason.
- Warden receives requests in real-time, reviews parental consent status, and approves or rejects with custom remarks.
- Approved leaves automatically reflect as "On Leave" in attendance rosters.

### 3.5 Maintenance & Grievance Ticketing Center
- Category categorization: Electrical, Plumbing, Carpentry, WiFi / Network, Cleanliness, Mess.
- Priority tiers: Low, Medium, High, Urgent.
- Lifecycle: `Pending` ➔ `In Progress` ➔ `Resolved` / `Rejected`.
- Technician notes and audit trail on completion.

### 3.6 Rooms & Bed Matrix Management
- Hierarchical room structure: Hostel ➔ Floor ➔ Room Number ➔ Bed Capacity.
- Real-time occupancy tracking (Available, Occupied, Under Maintenance).
- Room transfer request pipeline: Students apply with rationale; Admins approve and automatically swap or reassign beds.

### 3.7 Weekly Mess & Dining Planner
- 7-day cyclical meal scheduling: Breakfast, Lunch, High Tea / Snacks, Dinner.
- Special dietary or festive menu tags.
- Student view for daily meal discovery and nutritional transparency.

### 3.8 Financials: Fee Tracking, Invoicing & Fine Management
- Automated and manual fee invoices (Hostel Rent, Mess Advance, Late Entry Fine, Property Damage).
- Payment tracking: Paid, Unpaid, Overdue.
- Instant simulated digital payment transaction receipts with printable breakdown.

### 3.9 System Audit & Security Logging
- Append-only activity logs recording all administrative logins, room allocations, leave decisions, and fine issuances.
- IP recording, user-agent logging, and chronological event filtering.

---

## 4. Non-Functional Requirements (NFR)

- **Security & Authorization**: JWT (JSON Web Tokens) in Authorization header; Bcrypt (salt rounds 10+) for credential hashing; strict role-based access control (RBAC).
- **Tenant Isolation**: Database queries must scope to the authenticated user's institution to eliminate cross-tenant data leaks.
- **Responsiveness**: Mobile-first fluid experience across smartphone viewports (360px+), tablets, laptops, and ultra-wide displays.
- **Performance**: Sub-100ms API response times for standard queries; optimized indexes on MongoDB collections.
- **Aesthetic Excellence**: Premium modern dark glassmorphic design system using curated indigo/slate tones, backdrop filters, and subtle ambient glows.

---

## 5. Success Metrics & Key Performance Indicators (KPIs)
- **Attendance Verification Time**: Reduced from 30+ minutes per block to under 3 minutes via geofenced check-in.
- **Emergency Response Time**: Average warden acknowledgement of SOS events in < 60 seconds.
- **Grievance Resolution Cycle**: Mean Time to Resolve (MTTR) under 24 hours for urgent tickets.
- **Zero Data Contamination**: 100% verified tenant isolation across all API endpoints.
