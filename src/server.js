import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { decryptRequest, encryptResponse } from './middleware/encryption.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import enquiryRoutes from './routes/enquiry.routes.js';
import otpRoutes from './routes/otp.routes.js';
import careerRoutes from './routes/career.routes.js';
// import blogRoutes from './routes/blog.routes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'];
    if (!origin || allowed.some(o => o.trim() === origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Encrypted'],
}));

// ── Rate Limiting ────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Body Parsing ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── AES Encryption Middleware ────────────────
app.use('/api/', decryptRequest);
app.use('/api/', encryptResponse);

// ── Health Check ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Anvexs IT Hub API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Anvexs IT Hub API',
    endpoints: { health: '/health', auth: '/api/auth', otp: '/api/otp', enquiries: '/api/enquiries', careers: '/api/careers' },
  });
});

// ── API Routes ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/careers', careerRoutes);
// app.use('/api/blog', blogRoutes);

// ── 404 Handler ──────────────────────────────
app.all('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ── Global Error Handler ─────────────────────
app.use(errorHandler);

// ── Bootstrap ───────────────────────────────
const startServer = async () => {
  try {
    console.log('🔧 Starting Anvexs IT Hub API...');

    console.log('📦 Connecting to MongoDB...');
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    console.log('📧 Email service initialized (NODE_ENV: ' + process.env.NODE_ENV + ')');
    if (process.env.NODE_ENV === 'development') {
      console.log('⏭️  Development mode: Emails logged to console');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Anvexs API running on port ${PORT} [${process.env.NODE_ENV}]`);
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();