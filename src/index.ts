import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';

// Import routes
import userRoutes from './routes/userRoutes';
import twitterRoutes from './routes/twitterRoutes';
import apiDocsRoutes from './routes/apiDocsRoutes';
import elizaRoutes from './routes/elizaRoutes';
import healthRoutes from './routes/healthRoutes';

// Import services
import { initTwitterClient } from './services/twitterClient';
import { startPollingService } from './services/pollingService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
 
// Initialize Hedera client
let hederaClient: Client;

const initHederaClient = () => {
  try {
    // Check for required environment variables
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
      throw new Error('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be present in .env file');
    }

    // For testnet
    hederaClient = Client.forTestnet();
    
    // Set operator with account ID and private key from .env
    hederaClient.setOperator(
      AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
      PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );

    console.log('Hedera client initialized successfully');
  } catch (error) {
    console.error('Error initializing Hedera client:', error);
    process.exit(1);
  }
};

// Initialize Hedera client
initHederaClient();

// Create HCS topic if not already set
const setupHcsTopic = async () => {
  if (!process.env.HCS_TOPIC_ID) {
    try {
      const hederaService = require('./services/hederaService').default;
      const topicId = await hederaService.createTopic();
      console.log(`Created new HCS topic: ${topicId}`);
      process.env.HCS_TOPIC_ID = topicId;
    } catch (error) {
      console.error('Error creating HCS topic:', error);
      console.log('Continuing without HCS topic...');
      // Set a dummy topic ID to prevent future attempts
      process.env.HCS_TOPIC_ID = 'not_available';
    }
  } else {
    console.log(`Using existing HCS topic: ${process.env.HCS_TOPIC_ID}`);
  }
};

// Routes
app.use('/api/users', userRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/docs', apiDocsRoutes);
app.use('/api/eliza', elizaRoutes);
app.use('/api/health', healthRoutes);

// Simple root health check for Docker
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hedera Twitter Pay API is running' });
});

// Compatibility endpoint for the existing health check
app.get('/api/health', (req, res) => {
  const { getPollingStatus } = require('./services/pollingService');
  const pollingStatus = getPollingStatus();
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'Hedera Twitter Pay API is running',
    twitterIntegration: global.twitterScraper ? 'running' : 'not running',
    twitterPolling: pollingStatus.active ? 'active' : 'inactive',
    pollingInterval: pollingStatus.intervalMs ? `${pollingStatus.intervalMs / 1000} seconds` : null,
    hederaClient: hederaClient ? 'running' : 'not running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Map Twitter to Hedera endpoint
app.post('/api/map-account', (req, res) => {
  const { twitterUsername, hederaAccountId } = req.body;
  
  if (!twitterUsername || !hederaAccountId) {
    return res.status(400).json({ error: 'Twitter username and Hedera account ID are required' });
  }
  
  try {
    const { mapTwitterToHederaAccount } = require('./services/elizaService');
    
    // Map through Eliza service which handles the DB operations
    mapTwitterToHederaAccount(twitterUsername, hederaAccountId);
    
    res.status(200).json({ 
      success: true, 
      message: `Successfully mapped Twitter user @${twitterUsername} to Hedera account ${hederaAccountId}` 
    });
  } catch (error) {
    console.error('Error mapping account:', error);
    res.status(500).json({ error: 'Failed to map account' });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize Twitter client
  await initTwitterClient();
  
  // Setup HCS topic after server starts
  await setupHcsTopic();
  
  // Start Twitter polling service if Twitter client is initialized
  if (global.twitterScraper) {
    // Get polling interval from environment or default to 60 seconds
    const pollingIntervalMs = process.env.TWITTER_POLL_INTERVAL 
      ? parseInt(process.env.TWITTER_POLL_INTERVAL) * 1000 
      : 60000;
    
    startPollingService(pollingIntervalMs);
    console.log(`Started Twitter polling service with interval: ${pollingIntervalMs / 1000} seconds`);
  } else {
    console.warn('Twitter client not initialized, polling service not started');
  }
  
  console.log(`
    🚀 Hedera Twitter Pay API is running at http://localhost:${PORT}
    🐦 Twitter integration: ${global.twitterScraper ? 'running (using agent-twitter-client)' : 'not running'}
    🔗 Hedera client: running
    📋 API docs: http://localhost:${PORT}/api/docs
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    ⏱️ Polling interval: ${process.env.TWITTER_POLL_INTERVAL || '60'} seconds
  `);
});

export { hederaClient }; 