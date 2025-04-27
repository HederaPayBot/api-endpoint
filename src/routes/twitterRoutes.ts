import express from 'express';
import { 
  getRecentMentions, 
  sendTestReply,
  processMentions,
  forceReprocessTweets
} from '../controllers/twitterController';
import { createAccountForTwitterUser } from '../services/hederaAccountService';

const router = express.Router();

/**
 * Twitter polling endpoints
 */
// Poll for recent mentions and process them
router.get('/poll-mentions', processMentions);

// Add force=true parameter support for poll-mentions endpoint
router.get('/poll-mentions/force', (req, res, next) => {
  req.query.force = 'true';
  return processMentions(req, res);
});

/**
 * Development/testing endpoints
 * These are only available in development mode
 */
// Get recent mentions for testing
router.get('/mentions', (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return res.status(403).json({ error: 'This endpoint is disabled in production' });
  }
  return getRecentMentions(req, res);
});

// Send a test reply
router.post('/reply', (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return res.status(403).json({ error: 'This endpoint is disabled in production' });
  }
  return sendTestReply(req, res);
});

// Add an endpoint to directly test Eliza commands
router.post('/test-command', async (req, res) => {
  try {
    const { command, userId, userName } = req.body;
    const { sendCommandToEliza } = require('../services/elizaService');
    const { parseTwitterMention } = require('../services/twitterService');
    const { createAccountForTwitterUser } = require('../services/hederaAccountService');
    
    // First parse the command to see what type it is
    const parsedCommand = parseTwitterMention(`@TestBot ${command}`);
    console.log('Parsed command:', JSON.stringify(parsedCommand));
    
    // Handle registration intent or register command - create an account automatically
    if (parsedCommand.command === 'REGISTER_INTENT' || parsedCommand.command === 'REGISTER') {
      const result = await createAccountForTwitterUser(
        userName || 'test_user',
        userId || 'test_id',
        10 // Give them 10 HBAR initial balance
      );
      
      return res.status(200).json({
        success: result.success,
        parsedCommand,
        response: result.message,
        accountId: result.accountId,
        transactionId: result.transactionId
      });
    }
    
    // For other command types, use sendCommandToEliza
    const result = await sendCommandToEliza(command, userId || 'test_id', userName || 'test_user');
    return res.status(200).json({
      success: true,
      parsedCommand,
      result
    });
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

// Endpoint for frontend to send a command to Eliza using Twitter user info
// This allows logged-in users to interact with Eliza via the API
import { sendCommandToEliza } from '../services/elizaService';

router.post('/command', async (req, res) => {
  try {
    const { command,  userName } = req.body;

    if (!command  || !userName) {
      return res.status(400).json({ error: 'command, userId, and userName are required' });
    }

    // Forward the command to Eliza
    const elizaResponse = await sendCommandToEliza(command, userName,userName);

    return res.status(200).json({
      success: true,
      elizaResponse
    });
  } catch (error) {
    console.error('Error forwarding command to Eliza:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to forward command to Eliza',
      message: error.message
    });
  }
});


// Force reprocessing of tweets
router.post('/force-reprocess', forceReprocessTweets);

export default router; 



