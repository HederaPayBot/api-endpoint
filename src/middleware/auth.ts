/**
 * Authentication middleware for Twitter users
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        twitterId: string;
        username: string;
      };
    }
  }
}

/**
 * JWT secret for token validation
 * In production, this should be an environment variable
 */
const JWT_SECRET = process.env.JWT_SECRET || 'twitter-pay-jwt-secret-dev-only';

/**
 * Validate Twitter user authentication middleware
 * Checks for a valid JWT token and adds user info to the request
 */
export function validateTwitterUser(req: Request, res: Response, next: NextFunction) {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { twitterId: string; username: string };
    
    // Add user info to request
    req.user = {
      twitterId: decoded.twitterId,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Generate a JWT token for a Twitter user
 * @param twitterId - Twitter user ID
 * @param username - Twitter username
 * @returns JWT token
 */
export function generateAuthToken(twitterId: string, username: string): string {
  return jwt.sign(
    { twitterId, username },
    JWT_SECRET,
    { expiresIn: '30d' } // Token expires in 30 days
  );
} 