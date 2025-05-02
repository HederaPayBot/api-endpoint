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

    // Initialize the Twitter scraper with credentials
    const scraper = new Scraper();
    global.twitterScraper = scraper;

    console.log('Logging in to Twitter...');
    const cookies = await scraper.getCookies();
    console.log(`cookie: ${cookies ? 'received' : 'not available'}`);
    
    // Login with credentials and provide 2FA if available
    await scraper.login(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD,
      process.env.TWITTER_EMAIL,
      twoFactorSecret,
      process.env.TWITTER_API_KEY || '',
      process.env.TWITTER_API_KEY_SECRET || '',
      process.env.TWITTER_ACCESS_TOKEN || '',
      process.env.TWITTER_ACCESS_TOKEN_SECRET || ''
    );
    console.log('Logged in successfully');

    // Verify login was successful
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('Failed to login to Twitter');
    }

    console.log('Twitter client successfully initialized');
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error);
    
    // Provide more helpful error messages
    if (error.message && error.message.includes('ArkoseLogin')) {
      console.error('\n----- TWITTER ARKOSE LOGIN ERROR -----');
      console.error('Twitter is requiring additional verification.');
      console.error('Possible solutions:');
      console.error('1. Set up 2FA on your Twitter account and add TWITTER_2FA_SECRET to your .env file');
      console.error('2. Mark your Twitter account as "Automated" in Twitter settings');
      console.error('3. Try logging out of Twitter in your browser');
      console.error('4. Try connecting to/disconnecting from a VPN');
      console.error('5. Add DISABLE_TWITTER_INTEGRATION=true to your .env file to run without Twitter features');
      console.error('-----------------------------------------\n');
    }
    
    // Clean up in case of error
    global.twitterScraper = undefined;
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