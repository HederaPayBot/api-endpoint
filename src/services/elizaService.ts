import { hederaAccountService, userService } from './sqliteDbService';
import { hasValidCredentials } from './credentialService';
import axios from 'axios';

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
    const elizaAgent = process.env.ELIZA_AGENT_NAME || 'HederaBot';
    const endpoint = `${elizaUrl}/${encodeURIComponent(elizaAgent)}/message`;

    console.log(`Sending command to Eliza at ${endpoint}`);
    console.log(`Command: ${command}, UserId: ${userId}, UserName: ${userName}`);

    // Get the user's Hedera credentials using hederaAccountService.getHederaCredentials
    const credentials = hederaAccountService.getHederaCredentials(userName);
    console.log("credentials",credentials)
    if (!credentials) {
      throw new Error(`User ${userName} does not have registered Hedera credentials.`);
    }
    const { accountId, privateKey, publicKey, networkType, keyType } = credentials;
    console.log(`Using Hedera account ${accountId} for user ${userName}`);

    // Determine the command type based on command text
    const isBalanceCommand = command.toLowerCase().includes('balance');
    const isGreetingCommand = /^hello|hi|hey|greetings/i.test(command);

    // Prepare the request body, including credentials
    const requestData = {
      text: command,
      userId: userId,
      userName: userName,
      hederaCredentials: {
        accountId,
        privateKey,
        publicKey,
        networkType,
        keyType
      }
    };
    console.log("requestData",requestData)
    // Send the request to Eliza
    const response = await axios.post(endpoint, requestData);
    console.log("response",response)
    const responseData = response.data;
    console.log("responseData",responseData)
    responseData.map((item: any) => {
      console.log("responseData.content",item.content)
    })
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
      user: 'HederaBot',
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
      user: 'HederaBot',
      text: 'Hello! I\'m your Hedera Bot. How can I assist you with your Hedera account today?'
    }];
  }
  
  if (isBalanceCommand) {
    return [{
      user: 'HederaBot',
      text: 'I\'m unable to retrieve your balance information at the moment. Please make sure you\'ve registered your Hedera account with me using the "register" command.'
    }];
  }
  
  // Default fallback response
  return [{
    user: 'HederaBot',
    text: 'I understand you want to interact with the Hedera network. Here are some commands you can use:\n\n💰 Account: register, check balance\n🪙 Tokens: create token, send tokens\n📤 Transfer: airdrop tokens to multiple users\n\nFor full command reference: https://hederapaybot.netlify.app/help'
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