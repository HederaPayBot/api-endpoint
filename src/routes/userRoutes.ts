import { Router } from 'express';
import { 
  registerUser, 
  getUserProfile, 
  updateUserProfile,
  getLinkStatus,
  getUserTransactionHistory,
  getTransactionDetails,
  getAllUserTokens,
  getUserTokenById,
  linkUserToHederaAccount
} from '../controllers/userController';

const router = Router();

/**
 * User registration and management endpoints
 */
// Register a new user with Hedera account
router.post('/register/:username', registerUser);

// Get user profile information
router.get('/profile/:username', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

// Check if a Twitter user has linked their Hedera account
router.get('/link-status/:username', getLinkStatus);

// Get user's transaction history
router.get('/transactions/:username', getUserTransactionHistory);

// Get details of a specific transaction
router.get('/transaction/:transactionId/:username', getTransactionDetails);

// Get all tokens for a user
router.get('/all-tokens/:username', getAllUserTokens);

// Get a specific token for a user
router.get('/token/:tokenId/:username', getUserTokenById);

// Link a user to a Hedera account
router.post('/link-hedera-account', linkUserToHederaAccount);

export default router; 