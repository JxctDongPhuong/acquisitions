import express from 'express';
import { sql } from '#config/database.js';
import logger from '#config/logger.js';

const router = express.Router();
// check health cua project hien tai con dang chay hay khong neu truongf thi se tra ve du lieu  cua service
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'acquisitions-api',
  });
});

// check health cua database
router.get('/ready', async (req, res) => {
  try {
    await sql`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed - Database unreachable', {
      error: error.message,
    });

    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
