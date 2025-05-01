import { Router } from 'express';
import { 
  getUserProfile, 
  updateUserProfile,
  getLinkStatus,
  getUserTransactionHistory,
  getTransactionDetails,
  getAllUserTokens,
  getUserTokenById,
  getUserHbarBalance,
  linkUserToHederaAccount
} from '../controllers/userController';
import { createAccountForTwitterUser } from '../services/hederaAccountService';

const router = Router();

/**
 * User registration and management endpoints
 */
// Register a new user with auto Hedera account creation
router.post('/register', async (req, res) => {
  try {
    const { username, initialBalance } = req.body;
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }
    
    // Create a Twitter ID based on the username
    const twitterId = `twitter_${username}_${Date.now()}`;
    
    // Attempt to create a new Hedera account for the user
    const result = await createAccountForTwitterUser(
      username,
      twitterId,
      initialBalance || 10
    );
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error creating account during registration:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to register user',
      message: error.message
    });
  }
});

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

// Get user's HBAR balance
router.get('/hbar-balance/:username', getUserHbarBalance);

// Get all tokens for a user
router.get('/tokens/:username', getAllUserTokens);

// Get token details
router.get('/token/:tokenId/:username', getUserTokenById);

// Link a user to a Hedera account
router.post('/link-hedera-account', linkUserToHederaAccount);

export default router; 