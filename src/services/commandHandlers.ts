/**
 * Command Handlers for Hedera Twitter Pay API
 * 
 * These handlers process the different commands from Twitter mentions
 */
import { sendCommandToEliza, formatElizaResponseForTwitter } from './elizaService';
import { getHederaAccountFromTwitter } from './elizaService';
import { ParsedCommand } from './twitterService';
import { createAccountForTwitterUser } from './hederaAccountService';
import { saveTransaction } from './sqliteDbService';

/**
 * Utility function to extract transaction ID from response text
 * @param responseText - Text containing transaction ID
 * @returns Extracted transaction ID or null if not found
 */
function extractTransactionId(responseText: any): string | null {
  if (!responseText) return null;
  
  // Ensure we're working with a string
  const text = typeof responseText === 'string' ? responseText : 
               (responseText.text ? responseText.text : JSON.stringify(responseText));
  
  // Try various formats
  // Format 1: "Transaction link: https://hashscan.io/testnet/tx/0.0.5864628@1746058577.539329241"
  const txLinkMatch = text.match(/Transaction link: https:\/\/hashscan\.io\/.*?\/tx\/([\w.@]+)/);
      
  // Format 2: "tx/0.0.5864628@1746058577.539329241"
  const txMatch = text.match(/tx\/([\w.@]+)/);
      
  // Format 3: "Successfully completed transaction: 0.0.5864628@1746058577.539329241"
  const txDirectMatch = text.match(/transaction(?:\s*:|:)\s*([\w.@]+)/i);
  
  // Format 4: "Transaction link: https://hashscan.io/testnet/transaction/1738313812.597816600"
  // This format appears in some responses
  const txLinkAltMatch = text.match(/Transaction link: https:\/\/hashscan\.io\/.*?\/transaction\/([\w.@]+)/);
  
  // Format 5: "Successfully created... with id: 0.0.5478715"
  const createdWithIdMatch = text.match(/(?:created|deleted).*?(?:with\s+)?id:?\s+([0-9.]+)/i);
  
  // Format 6: "Successfully airdrop token... transaction link: https://hashscan.io..."
  const successWithLinkMatch = text.match(/Success.*?Transaction link: https:\/\/hashscan\.io\/.*?\/tx\/([\w.@]+)/i);
  
  if (txLinkMatch) return txLinkMatch[1];
  if (txMatch) return txMatch[1];
  if (txDirectMatch) return txDirectMatch[1];
  if (txLinkAltMatch) return txLinkAltMatch[1];
  if (createdWithIdMatch) return createdWithIdMatch[1];
  if (successWithLinkMatch) return successWithLinkMatch[1];
  
  return null;
}

/**
 * Extract transaction details from Eliza response and save to database
 * @param elizaResponse - Response from Eliza
 * @param username - Twitter username
 * @param txType - Transaction type
 * @param token - Token ID or type (e.g., 'HBAR')
 * @param amount - Amount transferred
 * @param memo - Memo or description
 * @param receiver - Recipient username or account ID
 */
function extractAndSaveTransaction(
  elizaResponse: any, 
  username: string, 
  txType: string, 
  token: string = '', 
  amount: string = '0', 
  memo: string = '', 
  receiver: string = ''
): void {
  try {
    // Get the actual response text (usually in the second item of the response array)
    const responseData = Array.isArray(elizaResponse) ? elizaResponse : [elizaResponse];
    const transferResponse = responseData.length > 1 ? responseData[1]?.text : responseData[0]?.text || elizaResponse;
    
    const transactionId = extractTransactionId(transferResponse);
    
    if (transactionId) {
      console.log(`Extracted transaction ID for ${txType}: ${transactionId}`);
      
      // Save the transaction to the database
      saveTransaction(
        username,
        receiver,
        transactionId,
        txType,
        amount,
        token,
        memo,
        'SUCCESS',
        process.env.HEDERA_NETWORK || 'testnet'
      );
    } else {
      console.log(`Could not extract transaction ID from response for ${txType}:`, transferResponse);
    }
  } catch (error) {
    console.error(`Error extracting/saving transaction for ${txType}:`, error);
  }
}

/**
 * Handle SEND command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleSendCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first before sending tokens. Please use the "register [accountId]" command.`;
    }
    
    // Verify parameters
    if (!command.receivers || command.receivers.length === 0) {
      return `@${username} Please specify who to send tokens to.`;
    }
    
    // Check if receivers are registered
    const receiverUsername = command.receivers[0];
    let receiverAccount = getHederaAccountFromTwitter(receiverUsername);
    
    // If receiver doesn't have an account, create one
    if (!receiverAccount) {
      console.log(`Creating Hedera account for Twitter user @${receiverUsername}`);
      
      try {
        // Create a new account for the receiver
        const result = await createAccountForTwitterUser(
          receiverUsername,
          `twitter_${receiverUsername}_${Date.now()}`, // Generate a placeholder Twitter ID
          1 // Give them 1 HBAR initial balance
        );
        
        if (result.success && result.accountId) {
          receiverAccount = result.accountId;
          console.log(`Successfully created Hedera account ${receiverAccount} for @${receiverUsername}`);
        } else {
          return `@${username} I couldn't create a Hedera account for @${receiverUsername}. Error: ${result.message}`;
        }
      } catch (error) {
        console.error(`Error creating account for @${receiverUsername}:`, error);
        return `@${username} There was an error creating a Hedera account for @${receiverUsername}. Please try again later.`;
      }
    }
    
    // Execute the transfer through Eliza
    const elizaResponse = await sendCommandToEliza(
      `Transfer ${command.amount} ${command.token} to account ${receiverAccount}`,
      username,
      username
    );

    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'TRANSFER',
      command.token || 'HBAR',
      command.amount?.toString() || '0',
      `Transfer to @${receiverUsername}`,
      receiverUsername
    );
    
    // Format response
    let response = formatElizaResponseForTwitter(elizaResponse);
    if (!getHederaAccountFromTwitter(receiverUsername) && receiverAccount) {
      response = `I created a new Hedera account for @${receiverUsername}. ${response}`;
    }
    
    return response;
  } catch (error) {
    console.error('Error in handleSendCommand:', error);
    return `@${username} There was an error processing your request. Please try again later.`;
  }
}

/**
 * Handle BALANCE command
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleBalanceCommand(username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to check balances. Please use the "register [accountId]" command.`;
    }
    
    // Get balances through Eliza
    console.log("hederaAccountId",hederaAccountId)
    console.log("username............",username)
    const elizaResponse = await sendCommandToEliza(
      "Show me all my token balances",
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleBalanceCommand:', error);
    return `@${username} There was an error fetching your token balances. Please try again later.`;
  }
}

/**
 * Handle HBAR_BALANCE command
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleHbarBalanceCommand(username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to check balances. Please use the "register [accountId]" command.`;
    }

    console.log("hederaAccountId",hederaAccountId)
    console.log("username",username)
    // Get HBAR balance through Eliza
    const elizaResponse = await sendCommandToEliza(
      "What's my HBAR balance?",
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleHbarBalanceCommand:', error);
    return `@${username} There was an error fetching your HBAR balance. Please try again later.`;
  }
}

/**
 * Handle CREATE_TOKEN command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleCreateTokenCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to create tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'CREATE_TOKEN',
      `${command.tokenName}:${command.tokenSymbol}`,
      command.initialSupply || '0',
      `Create token ${command.tokenName} (${command.tokenSymbol})`,
      '' // No receiver for token creation
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleCreateTokenCommand:', error);
    return `@${username} There was an error creating the token. Please try again later.`;
  }
}

/**
 * Handle AIRDROP command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleAirdropCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to airdrop tokens. Please use the "register [accountId]" command.`;
    }
    
    // Check for valid receivers
    if (!command.receivers || command.receivers.length === 0) {
      return `@${username} Please specify who to airdrop tokens to.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // For airdrops to multiple receivers, save one summary record
    const receivers = command.receivers.join(',');
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'AIRDROP',
      command.token || '',
      command.amount?.toString() || '0',
      `Airdrop ${command.token} to ${receivers}`,
      receivers
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleAirdropCommand:', error);
    return `@${username} There was an error airdropping the tokens. Please try again later.`;
  }
}

/**
 * Handle TOKEN_HOLDERS command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleTokenHoldersCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to check token holders. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleTokenHoldersCommand:', error);
    return `@${username} There was an error fetching token holders. Please try again later.`;
  }
}

/**
 * Handle MINT_TOKEN command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleMintTokenCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to mint tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'MINT_TOKEN',
      command.token || '',
      command.amount?.toString() || '0',
      `Mint ${command.amount} of token ${command.token}`,
      '' // No receiver for minting
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleMintTokenCommand:', error);
    return `@${username} There was an error minting the tokens. Please try again later.`;
  }
}

/**
 * Handle MINT_NFT command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleMintNftCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to mint NFTs. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'MINT_NFT',
      command.token || '',
      '1', // NFTs usually have amount 1
      `Mint NFT for token ${command.token}`,
      '' // No receiver for minting
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleMintNftCommand:', error);
    return `@${username} There was an error minting the NFT. Please try again later.`;
  }
}

/**
 * Handle REJECT_TOKEN command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleRejectTokenCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to reject tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'REJECT_TOKEN',
      command.token || '',
      '0', // No amount for reject token
      `Reject token ${command.token}`,
      '' // No receiver for reject token
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleRejectTokenCommand:', error);
    return `@${username} There was an error rejecting the token. Please try again later.`;
  }
}

/**
 * Handle ASSOCIATE_TOKEN command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleAssociateTokenCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to associate tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'ASSOCIATE_TOKEN',
      command.token || '',
      '0',
      `Associate token ${command.token}`,
      ''
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleAssociateTokenCommand:', error);
    return `@${username} There was an error associating the token. Please try again later.`;
  }
}

/**
 * Handle DISSOCIATE_TOKEN command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleDissociateTokenCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to dissociate tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'DISSOCIATE_TOKEN',
      command.token || '',
      '0',
      `Dissociate token ${command.token}`,
      ''
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleDissociateTokenCommand:', error);
    return `@${username} There was an error dissociating the token. Please try again later.`;
  }
}

/**
 * Handle TRANSFER_HBAR command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleTransferHbarCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to transfer HBAR. Please use the "register [accountId]" command.`;
    }
    
    // Check if receiver is specified
    if (!command.receiver) {
      return `@${username} Please specify who to send HBAR to.`;
    }
    
    // Check if receiver is registered
    const receiverUsername = command.receiver;
    let receiverAccount = getHederaAccountFromTwitter(receiverUsername);
    
    // If receiver doesn't have an account, create one
    if (!receiverAccount) {
      console.log(`Creating Hedera account for Twitter user @${receiverUsername}`);
      
      try {
        // Create a new account for the receiver
        const result = await createAccountForTwitterUser(
          receiverUsername,
          `twitter_${receiverUsername}_${Date.now()}`, // Generate a placeholder Twitter ID
          1 // Give them 1 HBAR initial balance
        );
        
        if (result.success && result.accountId) {
          receiverAccount = result.accountId;
          console.log(`Successfully created Hedera account ${receiverAccount} for @${receiverUsername}`);
        } else {
          return `@${username} I couldn't create a Hedera account for @${receiverUsername}. Error: ${result.message}`;
        }
      } catch (error) {
        console.error(`Error creating account for @${receiverUsername}:`, error);
        return `@${username} There was an error creating a Hedera account for @${receiverUsername}. Please try again later.`;
      }
    }
    
    // Execute the transfer through Eliza
    const elizaResponse = await sendCommandToEliza(
      `Transfer ${command.amount} HBAR to account ${receiverAccount}`,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'TRANSFER_HBAR',
      'HBAR',
      command.amount?.toString() || '0',
      `Transfer HBAR to @${receiverUsername}`,
      receiverUsername
    );
    
    // Format response
    let response = formatElizaResponseForTwitter(elizaResponse);
    if (!getHederaAccountFromTwitter(receiverUsername) && receiverAccount) {
      response = `I created a new Hedera account for @${receiverUsername}. ${response}`;
    }
    
    return response;
  } catch (error) {
    console.error('Error in handleTransferHbarCommand:', error);
    return `@${username} There was an error transferring HBAR. Please try again later.`;
  }
}

/**
 * Handle TRANSFER_HTS command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleTransferHtsCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to transfer tokens. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'TRANSFER_TOKEN',
      command.token || '',
      command.amount?.toString() || '0',
      `Transfer token ${command.token} to ${command.receiver || 'recipient'}`,
      command.receiver || ''
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleTransferHtsCommand:', error);
    return `@${username} There was an error transferring tokens. Please try again later.`;
  }
}

/**
 * Handle CLAIM_AIRDROP command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleClaimAirdropCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to claim airdrops. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'CLAIM_AIRDROP',
      command.token || '',
      '0', // Amount is not known at this point
      `Claim airdrop of token ${command.token} from ${command.sender || ''}`,
      command.sender || '' // Sender of the airdrop
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleClaimAirdropCommand:', error);
    return `@${username} There was an error claiming the airdrop. Please try again later.`;
  }
}

/**
 * Handle PENDING_AIRDROPS command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handlePendingAirdropsCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to view pending airdrops. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handlePendingAirdropsCommand:', error);
    return `@${username} There was an error fetching pending airdrops. Please try again later.`;
  }
}

/**
 * Handle GET_TOPIC_INFO command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleGetTopicInfoCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to get topic info. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleGetTopicInfoCommand:', error);
    return `@${username} There was an error fetching topic information. Please try again later.`;
  }
}

/**
 * Handle SUBMIT_TOPIC_MESSAGE command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleSubmitTopicMessageCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to submit topic messages. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'SUBMIT_TOPIC_MESSAGE',
      command.topicId || '', // Use topicId as the "token"
      '0', // No amount for topic messages
      `Submit message to topic ${command.topicId}`,
      '' // No receiver for topic messages
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleSubmitTopicMessageCommand:', error);
    return `@${username} There was an error submitting the message to the topic. Please try again later.`;
  }
}

/**
 * Handle CREATE_TOPIC command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleCreateTopicCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to create topics. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'CREATE_TOPIC',
      '', // No token for topics
      '0', // No amount for topic creation
      `Create topic with memo: ${command.memo || 'no memo'}`,
      '' // No receiver for topic creation
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleCreateTopicCommand:', error);
    return `@${username} There was an error creating the topic. Please try again later.`;
  }
}

/**
 * Handle GET_TOPIC_MESSAGES command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleGetTopicMessagesCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to get topic messages. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleGetTopicMessagesCommand:', error);
    return `@${username} There was an error fetching topic messages. Please try again later.`;
  }
}

/**
 * Handle DELETE_TOPIC command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */
export async function handleDeleteTopicCommand(command: ParsedCommand, username: string): Promise<string> {
  try {
    // First check if user is registered
    const hederaAccountId = getHederaAccountFromTwitter(username);
    if (!hederaAccountId) {
      return `@${username} You need to register your Hedera account first to delete topics. Please use the "register [accountId]" command.`;
    }
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    // Extract and save transaction details
    extractAndSaveTransaction(
      elizaResponse,
      username,
      'DELETE_TOPIC',
      command.topicId || '', // Use topicId as the "token"
      '0', // No amount for topic deletion
      `Delete topic ${command.topicId}`,
      '' // No receiver for topic deletion
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleDeleteTopicCommand:', error);
    return `@${username} There was an error deleting the topic. Please try again later.`;
  }
} 