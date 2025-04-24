/**
 * Command Handlers for Hedera Twitter Pay API
 * 
 * These handlers process the different commands from Twitter mentions
 */
import { sendCommandToEliza, formatElizaResponseForTwitter } from './elizaService';
import { getHederaAccountFromTwitter } from './elizaService';
import { ParsedCommand } from './twitterService';
import { createAccountForTwitterUser } from './hederaAccountService';

/**
 * Handle SEND command
 * @param command - Parsed command data
 * @param username - Twitter username
 * @returns Response text
 */

//TODO: if recipent account dosent exist create account for them 
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
    
    // If we created a new account, add that information to the response
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
    
    // Execute token creation through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleCreateTokenCommand:', error);
    return `@${username} There was an error creating your token. Please try again later.`;
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
    
    // Execute the airdrop through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleAirdropCommand:', error);
    return `@${username} There was an error processing your airdrop. Please try again later.`;
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
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleMintTokenCommand:', error);
    return `@${username} There was an error minting tokens. Please try again later.`;
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
    
    // Execute the command through Eliza
    const elizaResponse = await sendCommandToEliza(
      command.elizaCommand,
      username,
      username
    );
    
    return formatElizaResponseForTwitter(elizaResponse);
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
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleSubmitTopicMessageCommand:', error);
    return `@${username} There was an error submitting the topic message. Please try again later.`;
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
    
    return formatElizaResponseForTwitter(elizaResponse);
  } catch (error) {
    console.error('Error in handleDeleteTopicCommand:', error);
    return `@${username} There was an error deleting the topic. Please try again later.`;
  }
} 