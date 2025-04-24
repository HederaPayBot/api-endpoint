import { Router } from 'express';
import { 
  registerUser, 
  getUserProfile, 
  updateUserProfile,
  getLinkStatus
} from '../controllers/userController';

const router = Router();

/**
 * User registration and management endpoints
 */
// Register a new user with Hedera account
router.post('/register', registerUser);

// Get user profile information
router.get('/profile/:username', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

// Check if a Twitter user has linked their Hedera account
router.get('/link-status/:username', getLinkStatus);

export default router; 