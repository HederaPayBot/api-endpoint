import { hederaAccountService, userService } from './sqliteDbService';
import { hasValidCredentials } from './credentialService';
import axios from 'axios';
import { createAccountForTwitterUser } from './hederaAccountService';

/**
 * Map a Twitter username to a Hedera account ID
 * Uses database for persistence
 * 
 * @param twitterUsername - Twitter username (without @)
 * @param hederaAccountId - Hedera account ID (e.g., 0.0.12345)
 * @returns void
 */
export const mapTwitterToHederaAccount = (twitterUsername: string, hederaAccountId: string): void => {
  try {
    // Get user from database
    let user = userService.getUserByTwitterUsername(twitterUsername);
    
    // If user doesn't exist, create it
    if (!user) {
      const newUser = userService.createUser(twitterUsername, `twitter_${Date.now()}`);
      user = {
        id: Number(newUser.id),
        twitter_username: newUser.twitter_username,
        twitter_id: newUser.twitter_id,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      };
    }
    
    // Link Hedera account
    hederaAccountService.linkHederaAccount(user.id, hederaAccountId);
    
    console.log(`Mapped Twitter user @${twitterUsername} to Hedera account ${hederaAccountId}`);
  } catch (error) {
    console.error(`Error mapping Twitter user @${twitterUsername} to Hedera account ${hederaAccountId}:`, error);
    throw error;
  }
};

/**
 * Register a Twitter user with a Hedera account
 * This is specifically for user-initiated registration via Twitter
 * 
 * @param twitterUsername - Twitter username (without @)
 * @param twitterId - Twitter user ID 
 * @param hederaAccountId - Hedera account ID to register (optional)
 * @returns Object with success status and message
 */
const registerTwitterUser = async (
  twitterUsername: string,
  twitterId: string
): Promise<{success: boolean, message: string}> => {
  try {
    // Check if user exists and already has an account
    let user = userService.getUserByTwitterUsername(twitterUsername);
    if (user && user.hedera_account_id) {
      return {
        success: false,
        message: `You're already registered with Hedera account ${user.hedera_account_id}.`
      };
    }

    // Create a new account
    const result = await createAccountForTwitterUser(twitterUsername, twitterId);
    return {
      success: result.success,
      message: result.message
    };

  } catch (error) {
    console.error(`Error registering Twitter user @${twitterUsername}:`, error);
    return {
      success: false,
      message: `Error registering account. Please try again later.`
    };
  }
};

/**
 * Get Hedera account ID for a Twitter user
 * @param twitterUsername - Twitter username
 * @returns Hedera account ID or undefined if not found
 */
export function getHederaAccountFromTwitter(twitterUsername: string): string | undefined {
  try {
    // Check if user has registered Hedera credentials
    if (hasValidCredentials(twitterUsername)) {
      // Get the user from the database directly
      const user = userService.getUserByTwitterUsername(twitterUsername);
      if (user && user.hedera_account_id) {
        return user.hedera_account_id;
      }
    }
  } catch (error) {
    console.error(`Error getting Hedera account for Twitter user @${twitterUsername}:`, error);
  }
  
  return undefined;
}

/**
 * Process a special command from Twitter (like registration)
 * These commands don't need to be sent to Eliza but are handled directly
 * 
 * @param command - The parsed command object
 * @param userId - Twitter user ID
 * @param userName - Twitter username
 * @returns Response object for the command
 */
export const processSpecialCommand = async (
  command: string,
  commandParams: any,
  userId: string,
  userName: string
): Promise<any> => {
  try {
    switch (command) {
      case 'REGISTER':
        // Just register the user without requiring a Hedera account ID
        const match = commandParams.elizaCommand.match(/REGISTER/i);
        if (match) {
          const result = await registerTwitterUser(userName, userId);
          return { text: result.message };
        } else {
          return { text: "I couldn't process your registration. Please just use the command: register" };
        }
      
      default:
        return null; // Not a special command, should be processed by Eliza
    }
  } catch (error) {
    console.error('Error processing special command:', error);
    return { text: "Sorry, I encountered an error processing your command. Please try again later." };
  }
};

/**
 * Send a command to the Eliza agent
 * 
 * @param command - The command/query to send
 * @param userId - Twitter user ID
 * @param userName - Twitter username
 * @returns Response from Eliza
 */
export async function sendCommandToEliza(command: string, userId: string, userName: string): Promise<any> {
  try {
    // Get the URL for the Eliza API
    const elizaUrl = process.env.ELIZA_API_URL || 'http://localhost:3000';
    const elizaAgent = process.env.ELIZA_AGENT_NAME || 'Hedera Helper';
    const endpoint = `${elizaUrl}/${encodeURIComponent(elizaAgent)}/message`;
    
    console.log(`Sending command to Eliza at ${endpoint}`);
    console.log(`Command: ${command}, UserId: ${userId}, UserName: ${userName}`);
    
    // Assume the user has a registered Hedera account
    const hederaAccountId = getHederaAccountFromTwitter(userName);
    if (!hederaAccountId) {
      throw new Error(`User ${userName} does not have a registered Hedera account.`);
    }
    console.log(`Using Hedera account ${hederaAccountId} for user ${userName}`);
    
    // Determine the command type based on command text
    const isBalanceCommand = command.toLowerCase().includes('balance');
    const isGreetingCommand = /^hello|hi|hey|greetings/i.test(command);
    
    // Prepare the request body
    const requestData = {
      message: command,
      userId: userId,
      userName: userName,
      accountId: hederaAccountId
    };
    
    // Send the request to Eliza
    const response = await axios.post(endpoint, requestData);
    const responseData = response.data;
    
    // Validate Eliza's response
    if (!responseData || !Array.isArray(responseData)) {
      console.warn('Invalid response from Eliza:', responseData);
      return generateFallbackResponse(command, isBalanceCommand, isGreetingCommand);
    }
    
    // Check if Eliza responded with balance information when it wasn't a balance command
    if (!isBalanceCommand && responseData.some(item => item?.action === 'HEDERA_ALL_BALANCES')) {
      console.warn('Eliza hallucinated with balance information for non-balance command');
      return generateFallbackResponse(command, false, isGreetingCommand);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error sending command to Eliza:', error);
    
    // Generate fallback response for Eliza service failure
    return [{
      user: 'Hedera Helper',
      text: 'Sorry, I encountered an issue communicating with the Hedera network. Please try again later.'
    }];
  }
}

/**
 * Generate a fallback response when Eliza service fails or returns invalid data
 */
function generateFallbackResponse(command: string, isBalanceCommand: boolean, isGreetingCommand: boolean): any[] {
  if (isGreetingCommand) {
    return [{
      user: 'Hedera Helper',
      text: 'Hello! I\'m your Hedera Helper. How can I assist you with your Hedera account today?'
    }];
  }
  
  if (isBalanceCommand) {
    return [{
      user: 'Hedera Helper',
      text: 'I\'m unable to retrieve your balance information at the moment. Please make sure you\'ve registered your Hedera account with me using the "register" command.'
    }];
  }
  
  // Default fallback response
  return [{
    user: 'Hedera Helper',
    text: 'I understand you want to interact with the Hedera network. To help you better, please try one of these commands: check my balance, send tokens, or create token.'
  }];
}

/**
 * Format Eliza response for Twitter
 * This function takes the raw Eliza response and formats it for Twitter
 * 
 * @param elizaResponse - Raw response from Eliza
 * @returns Formatted response for Twitter
 */
export function formatElizaResponseForTwitter(elizaResponse: any[]): string {
  if (!elizaResponse || !Array.isArray(elizaResponse) || elizaResponse.length === 0) {
    return 'Sorry, I couldn\'t process your request at this time.';
  }
  
  // Extract text from each message
  const formattedMessages = elizaResponse
    .filter(item => item && item.text) // Only include items with text
    .map(item => item.text)
    .join('\n\n'); // Join with newlines between responses
  
  // Truncate if too long for Twitter (280 chars max)
  if (formattedMessages.length > 280) {
    return formattedMessages.substring(0, 277) + '...';
  }
  
  return formattedMessages;
} 