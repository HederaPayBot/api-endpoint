import { Scraper } from 'agent-twitter-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Declare the global namespace for TypeScript
declare global {
  var twitterScraper: Scraper | undefined;
}

/**
 * Initialize the Twitter client using agent-twitter-client
 * This creates a Twitter scraper instance and stores it in the global namespace
 */
export const initTwitterClient = async (): Promise<void> => {
  try {
    // Check if required environment variables are present
    if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD || !process.env.TWITTER_EMAIL) {
      throw new Error('TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are required environment variables');
    }

    // Initialize the Twitter scraper with credentials
    const scraper = new Scraper();
    global.twitterScraper = scraper;
    
    // Login with credentials
    await scraper.login(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD,
      process.env.TWITTER_EMAIL,
      process.env.TWITTER_API_KEY || '',
      process.env.TWITTER_API_KEY_SECRET || '',
      process.env.TWITTER_ACCESS_TOKEN || '',
      process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
    );
    
    // Verify login was successful
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('Failed to login to Twitter');
    }
    
    console.log('Twitter client successfully initialized');
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error);
    throw error;
  }
};

/**
 * Get the Twitter client instance
 * @returns The Twitter scraper instance
 */
export const getTwitterClient = (): Scraper | null => {
  if (!global.twitterScraper) {
    console.warn('Twitter client not initialized, call initTwitterClient() first');
    return null;
  }
  return global.twitterScraper;
};

/**
 * Utility to get user information by username
 */
export const getUserByUsername = async (username: string): Promise<any> => {
  if (!global.twitterScraper) {
    throw new Error('Twitter client not initialized');
  }
  
  try {
    const profile = await global.twitterScraper.getProfile(username);
    return profile;
  } catch (error) {
    console.error(`Error getting profile for ${username}:`, error);
    throw error;
  }
}; 