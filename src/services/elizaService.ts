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
  
  // Extract text from each message and handle errors properly
  const formattedMessages = elizaResponse
    .filter(item => item) // Only include valid items
    .map(item => {
      // Check if this is an error message - more comprehensive check
      if (
        // Direct error content
        item.content?.error || 
        // Error in text property
        (item.text && (
          item.text.includes('Error:') || 
          item.text.includes('error:') ||
          item.text.includes('ERROR:') ||
          item.text.includes('StatusError') ||
          item.text.includes('Transaction failed:') ||
          item.text.includes('failed:') ||
          item.text.includes('Exception:') ||
          item.text.includes('Invalid:') ||
          item.text.includes('Could not') ||
          item.text.includes('not found') ||
          item.text.includes('cannot be')
        )) ||
        // Error as action failure
        item.action?.includes('FAILED') ||
        // Direct error property
        item.error ||
        // Status property
        (item.status && item.status !== 'SUCCESS' && item.status !== 'OK')
      ) {
        // Build error message from all available information
        const errorText = item.text || 
                         item.content?.error || 
                         item.error || 
                         item.status || 
                         JSON.stringify(item.content) || 
                         'Unknown error';
        
        // Parse the error and return a user-friendly message
        const errorType = getErrorType(errorText);
        return getUserFriendlyErrorMessage(errorType);
      }
      
      // Regular message
      return item.text || '';
    })
    .filter(text => text.trim() !== '') // Remove empty messages
    .join('\n\n'); // Join with newlines between responses
  
  // Truncate if too long for Twitter (280 chars max)
  if (formattedMessages.length > 280) {
    return formattedMessages.substring(0, 277) + '...';
  }
  
  return formattedMessages;
}

/**
 * Extract the error type from an error message
 * @param errorMessage - The raw error message
 * @returns The error type
 */
function getErrorType(errorMessage: string): string {
  // Extract status from error message
  if (errorMessage.includes('INVALID_TOPIC_ID')) {
    return 'INVALID_TOPIC_ID';
  } else if (errorMessage.includes('UNAUTHORIZED')) {
    return 'UNAUTHORIZED';
  } else if (errorMessage.includes('INSUFFICIENT_BALANCE')) {
    return 'INSUFFICIENT_BALANCE';
  } else if (errorMessage.includes('INSUFFICIENT_TX_FEE')) {
    return 'INSUFFICIENT_TX_FEE';
  } else if (errorMessage.includes('INVALID_SIGNATURE')) {
    return 'INVALID_SIGNATURE';
  } else if (errorMessage.includes('ACCOUNT_NOT_FOUND')) {
    return 'ACCOUNT_NOT_FOUND';
  } else if (errorMessage.includes('TOKEN_NOT_FOUND')) {
    return 'TOKEN_NOT_FOUND';
  } else if (errorMessage.includes('TOPIC_NOT_FOUND')) {
    return 'TOPIC_NOT_FOUND';
  } else if (errorMessage.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
    return 'TOKEN_NOT_ASSOCIATED';
  } else if (errorMessage.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
    return 'TOKEN_ALREADY_ASSOCIATED';
  } else if (errorMessage.includes('INVALID_TOKEN_ID')) {
    return 'INVALID_TOKEN_ID';
  } else if (errorMessage.includes('INVALID_ACCOUNT_ID')) {
    return 'INVALID_ACCOUNT_ID';
  } else if (errorMessage.includes('TOKEN_HAS_NO_SUPPLY_KEY')) {
    return 'TOKEN_HAS_NO_SUPPLY_KEY';
  } else if (errorMessage.includes('KEY_REQUIRED')) {
    return 'KEY_REQUIRED';
  } else if (errorMessage.includes('INVALID_SUBMIT_KEY')) {
    return 'INVALID_SUBMIT_KEY';
  } else if (errorMessage.includes('INSUFFICIENT_TOKEN_BALANCE')) {
    return 'INSUFFICIENT_TOKEN_BALANCE';
  } else if (errorMessage.includes('INVALID_SOLIDITY_ADDRESS')) {
    return 'INVALID_SOLIDITY_ADDRESS';
  } else if (errorMessage.includes('MISSING_TOKEN_NAME')) {
    return 'MISSING_TOKEN_NAME';
  } else if (errorMessage.includes('MISSING_TOKEN_SYMBOL')) {
    return 'MISSING_TOKEN_SYMBOL';
  } else {
    return 'UNKNOWN_ERROR';
  }
}

/**
 * Get a user-friendly error message based on the error type
 * @param errorType - The type of error
 * @returns A user-friendly error message
 */
function getUserFriendlyErrorMessage(errorType: string): string {
  switch (errorType) {
    case 'INVALID_TOPIC_ID':
      return 'The topic ID you provided doesn\'t exist. Please check the ID and try again.';
    case 'UNAUTHORIZED':
      return 'You don\'t have permission to perform this action. You might not have the right keys.';
    case 'INSUFFICIENT_BALANCE':
      return 'You don\'t have enough HBAR balance to complete this transaction.';
    case 'INSUFFICIENT_TX_FEE':
      return 'The transaction fee is insufficient. Please try again with a higher fee.';
    case 'INVALID_SIGNATURE':
      return 'There was an authentication issue with your account.';
    case 'ACCOUNT_NOT_FOUND':
      return 'The account you specified couldn\'t be found. Please verify the account ID.';
    case 'TOKEN_NOT_FOUND':
      return 'The token you specified couldn\'t be found. Please verify the token ID.';
    case 'TOPIC_NOT_FOUND':
      return 'The topic you specified couldn\'t be found. Please verify the topic ID.';
    case 'TOKEN_NOT_ASSOCIATED':
      return 'The token is not associated with this account. Please associate the token first before performing this operation.';
    case 'TOKEN_ALREADY_ASSOCIATED':
      return 'This token is already associated with your account.';
    case 'INVALID_TOKEN_ID':
      return 'The token ID format is invalid. Please check and try again.';
    case 'INVALID_ACCOUNT_ID':
      return 'The account ID format is invalid. Please check and try again.';
    case 'TOKEN_HAS_NO_SUPPLY_KEY':
      return 'This token doesn\'t have a supply key, so new tokens can\'t be minted.';
    case 'KEY_REQUIRED':
      return 'This operation requires a specific key that your account doesn\'t have.';
    case 'INVALID_SUBMIT_KEY':
      return 'You don\'t have permission to submit messages to this topic.';
    case 'INSUFFICIENT_TOKEN_BALANCE':
      return 'You don\'t have enough tokens to complete this transaction.';
    case 'INVALID_SOLIDITY_ADDRESS':
      return 'The Ethereum address format is invalid. Please use a Hedera account ID instead.';
    case 'MISSING_TOKEN_NAME':
      return 'A token name is required to create a token.';
    case 'MISSING_TOKEN_SYMBOL':
      return 'A token symbol is required to create a token.';
    default:
      return 'Sorry, there was an error processing your request. Please try again later.';
  }
} 