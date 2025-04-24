import { Router } from 'express';

const router = Router();

/**
 * Health check endpoint for Docker and monitoring
 */
router.get('/', (req, res) => {
  try {
    // Return a 200 OK response with basic info
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

/**
 * Readiness check endpoint to ensure all dependencies are available
 */
router.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const dbAvailable = await checkDatabase();
    
    // Check if Hedera configuration is available
    const hederaConfigured = !!process.env.HEDERA_OPERATOR_ID && 
                            !!process.env.HEDERA_OPERATOR_KEY;
    
    // Return health status
    if (dbAvailable && hederaConfigured) {
      res.status(200).json({
        status: 'ready',
        database: 'available',
        hedera: 'configured'
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        database: dbAvailable ? 'available' : 'unavailable',
        hedera: hederaConfigured ? 'configured' : 'not configured'
      });
    }
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(500).json({ status: 'error', message: 'Readiness check failed' });
  }
});

/**
 * Check if database is available
 */
async function checkDatabase(): Promise<boolean> {
  try {
    // Simple check to see if we can access the database
    const { db } = require('../services/sqliteDbService');
    
    // If this doesn't throw an error, the database is available
    const dbVersion = db.pragma('user_version', { simple: true });
    return true;
  } catch (error) {
    console.error('Database check error:', error);
    return false;
  }
}

export default router; 