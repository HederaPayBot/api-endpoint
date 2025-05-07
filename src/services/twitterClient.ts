import { createTwitterApi } from './twitterApi';
import { TwitterApi } from './types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Declare the global namespace for TypeScript
declare global {
  var twitterApiClient: TwitterApi | undefined;
  var twitterReplyBot: TwitterApi | undefined;
}

/**
 * Initialize the Twitter client using our TwitterApi wrapper
 * This creates a Twitter API instance and stores it in the global namespace
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

    // Generate cookies path
    const cookiesPath = path.join(process.cwd(), 'twitter_cookies.json');
    console.log(`Using cookies path: ${cookiesPath}`);

    // Initialize the Twitter API with credentials for FETCHING
    const twitterApi = await createTwitterApi(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD,
      process.env.TWITTER_EMAIL,
      process.env.TWITTER_2FA_SECRET || '',
      cookiesPath
    );

    global.twitterApiClient = twitterApi;
    
    // Verify login was successful
    const isLoggedIn = await twitterApi.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('Failed to login to Twitter fetch account');
    }

    console.log('Twitter fetch client successfully initialized');
  } catch (error) {
    console.error('Failed to initialize Twitter fetch client:', error);
    global.twitterApiClient = undefined;
    throw error;
  }
};

// Add a function to initialize the reply bot
export const initTwitterReplyBot = async (): Promise<void> => {
  try {
    // Check if required environment variables are present
    if (!process.env.TWITTER_BOT_USERNAME || !process.env.TWITTER_BOT_PASSWORD || !process.env.TWITTER_BOT_EMAIL) {
      throw new Error('TWITTER_BOT_USERNAME, TWITTER_BOT_PASSWORD, and TWITTER_BOT_EMAIL are required for reply bot');
    }

    // Generate cookies path
    const cookiesPath = path.join(process.cwd(), 'twitter_reply_bot_cookies.json');
    console.log(`Using reply bot cookies path: ${cookiesPath}`);

    // Initialize the Twitter API with credentials for REPLYING
    const replyBotApi = await createTwitterApi(
      process.env.TWITTER_BOT_USERNAME,
      process.env.TWITTER_BOT_PASSWORD,
      process.env.TWITTER_BOT_EMAIL,
      process.env.TWITTER_BOT_2FA_SECRET || '',
      cookiesPath
    );
    
    global.twitterReplyBot = replyBotApi;
    
    // Verify login was successful
    const isLoggedIn = await replyBotApi.isLoggedIn();
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
 * @returns The Twitter API instance
 */
export const getTwitterClient = (): TwitterApi | null => {
  if (!global.twitterApiClient) {
    console.warn('Twitter fetch client not initialized, call initTwitterClient() first');
    return null;
  }
  return global.twitterApiClient;
};

// Get the Twitter client for replying
export const getTwitterReplyBot = (): TwitterApi | null => {
  if (!global.twitterReplyBot) {
    console.warn('Twitter reply bot not initialized, call initTwitterReplyBot() first');
    return null;
  }
  return global.twitterReplyBot;
};