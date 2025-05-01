import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
    const hederaConfigured = !!process.env.HEDERA_ACCOUNT_ID && 
                            !!process.env.HEDERA_PRIVATE_KEY;
    
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
    // Make sure db directory exists
    const dbDir = path.resolve(__dirname, '../../db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Try to initialize a connection to the database
    const dbPath = path.resolve(dbDir, 'hedPay.sqlite');
    const db = new Database(dbPath);
    
    // If this doesn't throw an error, the database is available
    const dbVersion = db.pragma('user_version', { simple: true });
    
    // Close the database connection
    db.close();
    
    return true;
  } catch (error) {
    console.error('Database check error:', error);
    return false;
  }
}

export default router; 