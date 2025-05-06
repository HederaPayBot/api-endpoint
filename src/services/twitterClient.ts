import { Scraper } from 'agent-twitter-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Declare the global namespace for TypeScript
declare global {
  var twitterScraper: Scraper | undefined;
  var twitterReplyBot: Scraper | undefined;
}

/**
 * Initialize the Twitter client using agent-twitter-client
 * This creates a Twitter scraper instance and stores it in the global namespace
 */
export const initTwitterClient = async (): Promise<void> => {
  try {
    // Check if Twitter integration is explicitly disabled
    if (process.env.DISABLE_TWITTER_INTEGRATION === 'true') {
      console.log('Twitter integration is explicitly disabled via DISABLE_TWITTER_INTEGRATION env variable');
      return;
    }
    
    // Check if required environment variables are present
    if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD || !process.env.TWITTER_EMAIL) {
      throw new Error('TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are required environment variables');
    }

    // Check if 2FA secret is available
    const twoFactorSecret = process.env.TWITTER_2FA_SECRET || '';
    if (!twoFactorSecret) {
      console.warn('TWITTER_2FA_SECRET not provided. You may need it for the ArkoseLogin challenge.');
    }

    // Initialize the Twitter scraper with credentials for FETCHING
    const scraper = new Scraper();
    global.twitterScraper = scraper;

    console.log('Logging in to Twitter fetch account...');
    const cookies = await scraper.getCookies();
    console.log(`cookie: ${cookies ? 'received' : 'not available'}`);
    
    // Login with credentials from env vars for the FETCHING account
    await scraper.login(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD,
      process.env.TWITTER_EMAIL,
      process.env.TWITTER_2FA_SECRET || '',
      process.env.TWITTER_API_KEY || '',
      process.env.TWITTER_API_KEY_SECRET || '',
      process.env.TWITTER_ACCESS_TOKEN || '',
      process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
    );
    
    console.log('Fetch account logged in successfully');
    
    // Verify login was successful
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('Failed to login to Twitter fetch account');
    }

    console.log('Twitter fetch client successfully initialized');
  } catch (error) {
    console.error('Failed to initialize Twitter fetch client:', error);
    global.twitterScraper = undefined;
    throw error;
  }
};

// Add a new function to initialize the reply bot
export const initTwitterReplyBot = async (): Promise<void> => {
  try {
    // Check if required environment variables are present
    if (!process.env.TWITTER_BOT_USERNAME || !process.env.TWITTER_BOT_PASSWORD || !process.env.TWITTER_BOT_EMAIL) {
      throw new Error('TWITTER_BOT_USERNAME, TWITTER_BOT_PASSWORD, and TWITTER_BOT_EMAIL are required for reply bot');
    }

    // Initialize the Twitter scraper with credentials for REPLYING
    const replyBot = new Scraper();
    global.twitterReplyBot = replyBot;

    console.log('Logging in to Twitter reply bot account...');
    const cookies = await replyBot.getCookies();
    console.log(`Reply bot cookie: ${cookies ? 'received' : 'not available'}`);
    
    // Login with credentials from env vars for the REPLY bot
    await replyBot.login(
      process.env.TWITTER_BOT_USERNAME,
      process.env.TWITTER_BOT_PASSWORD,
      process.env.TWITTER_BOT_EMAIL,
      process.env.TWITTER_BOT_2FA_SECRET || '',
      process.env.TWITTER_BOT_API_KEY || '',
      process.env.TWITTER_BOT_API_KEY_SECRET || '',
      process.env.TWITTER_BOT_ACCESS_TOKEN || '',
      process.env.TWITTER_BOT_ACCESS_TOKEN_SECRET || ''
    );
    
    console.log('Reply bot logged in successfully');
    
    // Verify login was successful
    const isLoggedIn = await replyBot.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('Failed to login to Twitter reply bot account');
    }

    console.log('Twitter reply bot successfully initialized');
  } catch (error) {
    console.error('Failed to initialize Twitter reply bot:', error);
    global.twitterReplyBot = undefined;
    throw error;
  }
};

/**
 * Get the Twitter client instance
 * @returns The Twitter scraper instance
 */
export const getTwitterClient = (): Scraper | null => {
  if (!global.twitterScraper) {
    console.warn('Twitter fetch client not initialized, call initTwitterClient() first');
    return null;
  }
  return global.twitterScraper;
};

// Get the Twitter client for replying
export const getTwitterReplyBot = (): Scraper | null => {
  if (!global.twitterReplyBot) {
    console.warn('Twitter reply bot not initialized, call initTwitterReplyBot() first');
    return null;
  }
  return global.twitterReplyBot;
};