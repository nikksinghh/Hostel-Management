import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import helmet from 'helmet';
import connectDB from './config/db.js';
import { getValidatedJwtSecret } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import wardenRoutes from './routes/wardenRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import mongoSanitize from './middleware/mongoSanitizeMiddleware.js';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Validate JWT Secret on startup (fail fast if missing or insecure)
try {
  getValidatedJwtSecret();
} catch (err) {
  console.error(`❌ [Configuration Error]: ${err.message}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Connect to MongoDB
connectDB();

const app = express();

// Trust reverse proxy for accurate client IP resolution behind load balancers/Render/Nginx
app.set('trust proxy', 1);

// Security Headers via Helmet & custom defense-in-depth headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  contentSecurityPolicy: false,
}));

// Additional defensive headers
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Whitelist-checked CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// Body parsing with strict size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Operator Injection & Prototype Pollution Defense
app.use(mongoSanitize);

// Serve static upload directory with nosniff and download sandbox headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  next();
}, express.static(path.join(__dirname, 'uploads'), { index: false, dotfiles: 'ignore' }));

// Health Check API (Database-aware)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const statusCode = isDbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: isDbConnected ? 'online' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    message: isDbConnected
      ? 'CampusHome Backend API is running smoothly'
      : 'Database connection is currently unavailable',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

import superAdminRoutes from './routes/superAdminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listening if run directly (not when imported in tests)
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))) {
  app.listen(PORT, () => {
    console.log(`🚀 [CampusHome Server]: Running on http://localhost:${PORT}`);
  });
}

export default app;
