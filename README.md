# CampusHome — Multi-Tenant Hostel Management SaaS

**CampusHome** is an enterprise-grade, secure, multi-tenant Hostel Management and Room Allocation SaaS platform built on the modern MERN stack. It enables colleges, universities, and institutions to manage hostel admissions, room inventories, warden operations, student complaints, gate attendance with GPS geofencing, leave workflows, and fee payments in an isolated multi-tenant architecture.

---

## 🚀 Key Features & Capabilities

- **Strict Multi-Tenant Isolation:** Dynamic multi-tenant scoping across all institutions, hostels, rooms, wardens, and students.
- **Role-Based Access Control (RBAC):**
  - **Super Admin:** Platform analytics, institution verification, approval/suspension lifecycle, audit logs.
  - **Institution Admin:** Tenant hostel management, room allocation, bed capacity control, staff & warden administration.
  - **Warden:** Floor-level operations, check-in attendance with GPS geofencing, room transfer approvals, leave requests, complaint handling.
  - **Student:** Hostel admission self-service, real-time room occupancy, profile management, gate check-in, grievance lodging.
- **Email Verification (Brevo Transactional API):**
  - Dual verification methods: Secure single-use verification links and 6-digit OTP codes.
  - SHA-256 token and OTP hashing stored in database with TTL (15m OTP / 24h link).
  - Rate-limited verification attempts (max 5 failed attempts per OTP before automatic invalidation).
  - 60-second cooldown timer on resend requests to eliminate email flooding.
  - Secure single-use password reset flows.
- **Official Google Sign-In (Google Identity Services):**
  - Server-side ID token verification using Google's official `google-auth-library`.
  - Signature, audience, issuer (`accounts.google.com`), and expiration validation.
  - Safe account linking via Google `sub` identifier; prevents account takeover.
  - Zero automatic privilege escalation (Google Sign-In cannot grant Super Admin or Institution Admin roles).
- **Security Hardening (FIX-01 through FIX-07):**
  - Database health monitoring with `/api/health`.
  - Sliding-window authentication rate limiting.
  - Upload file validation using magic-byte inspection, strict MIME, and extension whitelisting.
  - Production error sanitization hiding stack traces.
  - Atomic room allocation and bed capacity management with optimistic/pessimistic lock semantics.
  - Atomic payment idempotency enforcement.
  - Strict JWT validation enforcing a minimum 32-character secret with zero insecure fallbacks.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React Router 7, Lucide Icons, Vanilla CSS Design System |
| **Backend** | Node.js (ES Modules), Express.js, Multer |
| **Database** | MongoDB, Mongoose 8+ |
| **Authentication** | JSON Web Tokens (JWT), Google Identity Services, Google Auth Library |
| **Email Service** | Brevo Transactional Email REST API |
| **Security** | Bcrypt.js, File-Type / Magic Bytes, Helmet, Express Rate Limit |

---

## 📋 Prerequisites

- **Node.js:** v18.0.0 or higher
- **MongoDB:** v6.0+ (Local Community Server or MongoDB Atlas)
- **Brevo Account:** Free API key for transactional emails ([brevo.com](https://www.brevo.com/))
- **Google Cloud Console:** OAuth 2.0 Web Client ID ([console.cloud.google.com](https://console.cloud.google.com/))

---

## ⚙️ Environment Variables Configuration

### Backend (`server/.env`)

Create `server/.env` based on `server/.env.example`:

```ini
PORT=5050
NODE_ENV=development

# MongoDB Connection String (Atlas in Production)
MONGODB_URI=mongodb://127.0.0.1:27017/campushome

# Strict 32+ Character JWT Secret
JWT_SECRET=your_32_character_minimum_random_secret_here_2026
JWT_EXPIRES_IN=7d

# Allowed Frontend URL for CORS
CLIENT_URL=http://localhost:5173

# Brevo Transactional Email API (https://app.brevo.com/settings/keys/api)
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
BREVO_SENDER_EMAIL=no-reply@yourdomain.com
BREVO_SENDER_NAME=CampusHome

# Google OAuth 2.0 Client ID (Backend Server Verification)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### Frontend (`client/.env`)

Create `client/.env` based on `client/.env.example`:

```ini
# Backend API Base URL (/api for local Vite proxy, full URL in production)
VITE_API_BASE_URL=/api

# Google OAuth 2.0 Client ID (Frontend Google Identity Services)
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## 💻 Local Installation & Setup

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repository_url>
cd hostel-management-system

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Files

```bash
# In server directory
cp .env.example .env

# In client directory
cp .env.example .env
```

### 3. Start the Development Servers

```bash
# Terminal 1: Backend Server (Port 5050)
cd server
npm start

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing & Verification

The project includes regression test suites validating multi-tenant boundaries, security fixes, email verification, and OAuth:

```bash
# In server directory:
# 1. Run Email Verification & Google Auth Test Suite (32 tests)
node test_email_and_google_auth.js

# 2. Run Multi-Tenant Isolation Tests (7 tests)
node test_tenant_isolation.js

# 3. Run Phase C Institution Admin & Hostel CRUD Tests (18 tests)
node test_phase_c.js

# 4. Run Phase D Warden & Student Workflows (24 tests)
node test_phase_d.js

# 5. Run Security Controls FIX-01 to FIX-07 Audit (9 tests)
node test_security_audit.js

# 6. Run Acceptance & Platform Telemetry Tests (10 tests)
node test_audit_and_acceptance.js
```

---

## 🚢 Production Deployment Guide

### Architecture Overview

```
[Users / Browsers]
        │
        ├──► Vercel (Frontend: React / Vite)
        │       │
        │       └──► Render (Backend: Node.js Express)
        │                 │
        │                 ├──► MongoDB Atlas (Database)
        │                 ├──► Brevo API (Transactional Emails)
        │                 └──► Google Identity APIs (OAuth Verification)
```

### 1. Database (MongoDB Atlas)
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user with read/write access.
3. Whitelist Render backend IP addresses or enable `0.0.0.0/0` with strong authentication.
4. Obtain the connection URI (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/campushome?retryWrites=true&w=majority`).

### 2. Backend (Render)
1. Create a **New Web Service** connected to your GitHub repository.
2. Settings:
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. Add Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5050`
   - `MONGODB_URI=<Atlas Connection String>`
   - `JWT_SECRET=<Random 64+ char secret>`
   - `CLIENT_URL=https://<your-vercel-app>.vercel.app`
   - `BREVO_API_KEY=<Your Brevo API Key>`
   - `BREVO_SENDER_EMAIL=<Your Verified Brevo Sender>`
   - `BREVO_SENDER_NAME=CampusHome`
   - `GOOGLE_CLIENT_ID=<Your Google Web Client ID>`

### 3. Frontend (Vercel)
1. Import your GitHub repository into [Vercel](https://vercel.com/).
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID=<Your Google Web Client ID>`
4. Deploy!

### 4. Google Cloud Console Configuration
1. In Google Cloud Console, navigate to **APIs & Services > Credentials**.
2. Edit your OAuth 2.0 Web Client ID:
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `https://<your-vercel-app>.vercel.app`
   - **Authorized redirect URIs:**
     - `http://localhost:5173/login`
     - `https://<your-vercel-app>.vercel.app/login`

---

## 🔒 Security Policy & Reporting

- Never commit `.env` files or raw credentials to source control.
- All secrets must be provisioned securely via hosting platform dashboards (Vercel & Render).
- In production, ensure all communications occur over TLS/HTTPS.

---

## 📄 License

Proprietary — CampusHome Platform. All rights reserved.
