import { Router } from 'express';
import { 
  getRecentMentions, 
  sendTestReply,
  processMentions
} from '../controllers/twitterController';
import { createAccountForTwitterUser } from '../services/hederaAccountService';

const router = Router();

/**
 * Twitter polling endpoints
 */
// Poll for recent mentions and process them
router.get('/poll-mentions', processMentions);

/**
 * Development/testing endpoints
 * These are only available in development mode
 */
// Get recent mentions for testing
router.get('/mentions', getRecentMentions);

// Send a test reply
router.post('/reply', sendTestReply);

// Add an endpoint to directly test Eliza commands
router.post('/test-command', async (req, res) => {
  try {
    const { command, userId, userName } = req.body;
    const { sendCommandToEliza } = require('../services/elizaService');
    
    const result = await sendCommandToEliza(command, userId || 'test_id', userName || 'test_user');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error testing Eliza command:', error);
    return res.status(500).json({ error: 'Failed to send command to Eliza' });
  }
});

// Add an endpoint to test balance detection
router.post('/test-balance', async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    
    const { isBalanceQuery, generateBalanceResponse } = require('../services/twitterService');
    
    // Check if the text is a balance query
    const balanceCheck = isBalanceQuery(text);
    
    // If not a balance query, return the check result
    if (!balanceCheck.isBalanceQuery || balanceCheck.type === 'NONE') {
      return res.status(200).json({
        isBalanceQuery: balanceCheck.isBalanceQuery,
        type: balanceCheck.type,
        message: 'Not a valid balance query'
      });
    }
    
    // If user ID is provided, generate a response
    let response = null;
    if (userId) {
      response = await generateBalanceResponse(
        userId, 
        balanceCheck.type, 
        balanceCheck.tokenId
      );
    }
    
    return res.status(200).json({
      isBalanceQuery: balanceCheck.isBalanceQuery,
      type: balanceCheck.type,
      tokenId: balanceCheck.tokenId,
      response
    });
  } catch (error) {
    console.error('Error testing balance query:', error);
    return res.status(500).json({ error: 'Failed to test balance query' });
  }
});

// Add an endpoint to test automatic account creation
router.post('/test-auto-create-account', async (req, res) => {
  try {
    const { twitterUsername, initialBalance } = req.body;
    
    if (!twitterUsername) {
      return res.status(400).json({ error: 'Twitter username is required' });
    }
    
    // Create a Twitter ID based on the username for testing
    const twitterId = `twitter_${twitterUsername}_${Date.now()}`;
    
    // Attempt to create a new Hedera account for the user
    const result = await createAccountForTwitterUser(
      twitterUsername,
      twitterId,
      initialBalance || 1
    );
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error testing automatic account creation:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create account',
      message: error.message
    });
  }
});

export default router; 



