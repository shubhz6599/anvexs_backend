// ============================================
// ANVEXS - MongoDB Connection Configuration
// ============================================
import mongoose from 'mongoose';
import { logger } from './logger.js';

export const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/anvexs_db';

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️ MongoDB disconnected'));

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};