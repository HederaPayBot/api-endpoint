import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';

// Import routes
import twitterRoutes from './routes/twitterRoutes';

// Import services
import { mapTwitterToHederaAccount } from './services/elizaService';
import { Scraper } from 'agent-twitter-client';
import { initTwitterClient } from './services/twitterClient';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Hedera client
let hederaClient: Client;

const initHederaClient = () => {
  try {
    // Check for required environment variables
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
      console.log('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY not found in .env file, using default testnet client');
      hederaClient = Client.forTestnet();
      return;
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
    // Don't exit - just continue with a warning
    console.log('Running without Hedera credentials');
  }
};

// Initialize Hedera client
initHederaClient();

// Store Twitter client in global namespace for use across modules
declare global {
  var twitterScraper: Scraper;
}

// Initialize Twitter client
const setupTwitterClient = async () => {
  try {
    // Check for required Twitter environment variables
    if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD || !process.env.TWITTER_EMAIL) {
      console.warn('TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are required for Twitter integration');
      return;
    }
    
    await initTwitterClient();
    console.log('Twitter client initialized successfully');
  } catch (error) {
    console.error('Error initializing Twitter client:', error);
  }
};

// Call Twitter client initialization
setupTwitterClient();

// Routes
app.use('/api/twitter', twitterRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Hedera Twitter Pay API is running',
    hederaClient: hederaClient ? 'running' : 'not running',
    twitterIntegration: global.twitterScraper ? 'running' : 'not running'
  });
});

// Map Twitter to Hedera endpoint
app.post('/api/map-account', (req, res) => {
  const { twitterUsername, hederaAccountId } = req.body;
  
  if (!twitterUsername || !hederaAccountId) {
    return res.status(400).json({ error: 'Twitter username and Hedera account ID are required' });
  }
  
  try {
    console.log(`Mapping Twitter user @${twitterUsername} to Hedera account ${hederaAccountId}`);
    // Map the account using the Eliza service
    mapTwitterToHederaAccount(twitterUsername, hederaAccountId);
    res.status(200).json({ success: true, message: 'Account mapped successfully' });
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
  
});

export { hederaClient }; 