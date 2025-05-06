import { getTwitterClient } from './twitterClient';
import { sendCommandToEliza, formatElizaResponseForTwitter } from './elizaService';
import { userService } from './sqliteDbService';
/**
 * Interface for parsed Twitter mention command
 */
export interface ParsedCommand {
  command: string;
  elizaCommand: string;
  amount?: string;
  token?: string;
  receivers?: string[];
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
  initialSupply?: string;
  isSupplyKey?: boolean;
  isAdminKey?: boolean;
  isMetadataKey?: boolean;
  memo?: string;
  tokenMetadata?: string;
  originalText: string;
  // New fields for additional Hedera operations
  threshold?: string;
  receiver?: string;
  sender?: string;
  accountId?: string;
  topicId?: string;
  message?: string;
  isSubmitKey?: boolean;
  lowerThreshold?: string; 
  upperThreshold?: string;
}

// Add this where you have your imports
enum SearchMode {
  Top = 0,
  Latest = 1,
  Photos = 2,
  Videos = 3,
  Users = 4
}

/**
 * Parse a Twitter mention into a structured command for Eliza
 * This is the core function that translates Twitter mentions into actions
 * 
 * @param mentionText - The full text of the mention tweet
 * @returns ParsedCommand object with structured data
 */
export function parseTwitterMention(mentionText: string): ParsedCommand {
  // Remove the bot's @username from the beginning
  const botUsername = process.env.TWITTER_BOT_USERNAME || 'HederaPayBot';
  const regex = new RegExp(`^@${botUsername}\\s+`, 'i');
  const textWithoutMention = mentionText.replace(regex, '');
  
  // Clean up text by removing any other @mentions
  const textWithoutAnyMentions = textWithoutMention.replace(/@\w+/g, '').trim();
  
  // Default return for unrecognized commands
  const defaultReturn: ParsedCommand = {
    command: 'UNKNOWN',
    elizaCommand: textWithoutAnyMentions, // Pass the original text to Eliza
    originalText: mentionText
  };
  
  // Common patterns for commands
  const sendPattern = /(?:SEND|TRANSFER)\s+(\d+(?:\.\d+)?)\s+([A-Z]+)\s+(?:TO\s+)?(@[a-zA-Z0-9_]+)/i;
  // New pattern to handle "SEND @user [amount] [token]" format
  const sendReversePattern = /(?:SEND|TRANSFER)\s+(@[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)\s+([A-Z]+)/i;
  const airdropPattern = /AIRDROP\s+(\d+(?:\.\d+)?)\s+([A-Z]+)\s+(?:TO\s+)?(@[a-zA-Z0-9_]+(?:\s+@[a-zA-Z0-9_]+)*)/i;
  
  // More flexible balance patterns
  const balancePattern = /(?:WHAT(?:'S|S)?|SHOW|CHECK|DISPLAY|GET)\s+(?:(?:IS|ARE)\s+)?(?:MY|THE)\s+(?:TOKEN\s+)?BALANCE(?:S)?/i;
  const hbarBalancePattern = /(?:WHAT(?:'S|S)?|SHOW|CHECK|DISPLAY|GET)\s+(?:(?:IS|ARE)\s+)?(?:MY|THE)\s+(?:HBAR\s+)?BALANCE(?:S)?/i;
  
  // Token specific operations patterns
  const tokenHoldersPattern = /(?:SHOW|GET|LIST|DISPLAY)\s+(?:THE\s+)?(?:TOKEN\s+)?HOLDERS\s+(?:FOR|OF)\s+([0-9.]+)(?:\s+WITH\s+(?:MINIMUM\s+)?BALANCE\s+(?:EQUAL\s+)?(\d+))?/i;
  const mintTokenPattern = /(?:MINT|GENERATE|INCREASE\s+SUPPLY\s+OF)\s+(\d+(?:\.\d+)?)\s+(?:TOKENS|OF)?\s+([0-9.]+)/i;
  const mintNftPattern = /MINT\s+NFT\s+([0-9.]+)(?:\s+WITH\s+METADATA\s+['"]([^'"]+)['"])?/i;
  const rejectTokenPattern = /REJECT\s+TOKEN\s+([0-9.]+)/i;
  const associateTokenPattern = /(?:ASSOCIATE|CONNECT|LINK)\s+(?:MY\s+)?(?:WALLET|ACCOUNT)\s+(?:WITH|TO)\s+TOKEN\s+([0-9.]+)/i;
  const dissociateTokenPattern = /(?:DISSOCIATE|DISCONNECT|UNLINK)\s+(?:MY\s+)?(?:WALLET|ACCOUNT)\s+(?:WITH|FROM)\s+TOKEN\s+([0-9.]+)/i;
  const transferHbarPattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(\d+(?:\.\d+)?)\s+HBAR\s+TO\s+(?:ACCOUNT\s+|@)?([0-9.]+|[a-zA-Z0-9_]+)/i;
  const transferHtsPattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(\d+(?:\.\d+)?)\s+(?:OF|TOKENS|TOKEN)?\s+([0-9.]+)\s+TO\s+(?:ACCOUNT\s+|@)?([0-9.]+|[a-zA-Z0-9_]+)/i;
  const claimAirdropPattern = /(?:CLAIM|ACCEPT)\s+AIRDROP\s+(?:OF\s+)?(?:TOKEN\s+)?([0-9.]+)\s+FROM\s+(?:ACCOUNT\s+)?([0-9.]+)/i;
  const pendingAirdropPattern = /SHOW\s+PENDING\s+AIRDROPS(?:\s+FOR\s+(?:THE\s+)?(?:ACCOUNT\s+)?(?:WITH\s+ID\s+)?([0-9.]+))?/i;
  
  // Now also add reverse versions of the transferHbar and transferHts patterns
  const transferHbarReversePattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(?:TO\s+)?(?:ACCOUNT\s+|@)?([0-9.]+|[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)\s+HBAR/i;
  const transferHtsReversePattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(?:TO\s+)?(?:ACCOUNT\s+|@)?([0-9.]+|[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)\s+(?:OF|TOKENS|TOKEN)?\s+([0-9.]+)/i;
  
  // More flexible general send pattern to catch various user inputs
  const flexibleSendPattern = /(?:SEND|TRANSFER)\s+(?:TO\s+)?(@[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)\s+([A-Z]+)/i;
  
  // Topic operations patterns
  const getTopicInfoPattern = /(?:SHOW|GET|FETCH|GIVE\s+ME)\s+(?:INFO|DETAILS|INFORMATION)\s+(?:ABOUT|ON|FOR)\s+TOPIC\s+([0-9.]+)/i;
  const submitTopicMessagePattern = /(?:SUBMIT|SEND|POST)\s+(?:MESSAGE\s+)?['"]([^'"]+)['"]\s+TO\s+TOPIC\s+([0-9.]+)/i;
  const createTopicPattern = /CREATE\s+TOPIC\s+WITH\s+MEMO\s*:\s*['"]?([^'"]+)['"]?(?:\s+(?:PLEASE\s+)?(SET|DO\s+NOT\s+SET)\s+SUBMIT\s+KEY)?/i;
  const getTopicMessagesPattern = /GET\s+MESSAGES\s+FROM\s+TOPIC\s+([0-9.]+)(?:\s+THAT\s+WERE\s+POSTED\s+(?:AFTER\s+([^AND]+))?(?:\s+AND\s+BEFORE\s+([^\.]+))?)?/i;
  const deleteTopicPattern = /DELETE\s+TOPIC\s+(?:WITH\s+ID\s+)?([0-9.]+)/i;
  
  // Simple balance patterns
  const simpleBalancePattern = /(?:my |token )?balance(?:s)?/i;
  const simpleHbarBalancePattern = /(?:my )?hbar balance/i;
  
  const registerPattern = /REGISTER\s+(?:ACCOUNT\s+)?([0-9.]+)/i;
  // New pattern for general registration intent without an account ID
  const registerIntentPattern = /REGISTER(?:\s+(?:A\s+)?NEW\s+ACCOUNT|\s+(?:ME|MYSELF)|(?:\s+AN?\s+ACCOUNT)?)/i;
  
  const createTokenPattern = /CREATE\s+TOKEN\s+([a-zA-Z0-9\s]+)\s+(?:WITH\s+)?SYMBOL\s+([A-Z]+)\s*,?\s*(\d+)\s+DECIMAL(?:S)?\s*,?\s*(?:AND)?\s*(?:STARTING|INITIAL)?\s*SUPPLY\s+(?:OF\s+)?(\d+(?:\.\d+)?)/i;
  
  // Improved greeting pattern
  const greetingPattern = /^(?:HI|HELLO|HEY|GREETINGS|HOWDY|SUP|YO|WHAT'S UP|GOOD MORNING|GOOD AFTERNOON|GOOD EVENING)(?:\s|\.|,|!|\?|$)/i;
  
  // Extract command details based on patterns
  if (sendPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(sendPattern);
    if (matches) {
      const receiverUsername = matches[3].substring(1); // Remove @ from username
      const token = matches[2];
      
      // If token is HBAR, handle specially by updating command
      const commandType = token === 'HBAR' ? 'TRANSFER_HBAR' : 'SEND';
      
      return {
        command: commandType,
        amount: matches[1],
        token: matches[2],
        receivers: [receiverUsername],
        receiver: receiverUsername, // Add receiver field for TRANSFER_HBAR compatibility
        elizaCommand: `Transfer ${matches[1]} ${matches[2]} to account ${receiverUsername}`,
        originalText: mentionText
      };
    }
  } else if (sendReversePattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(sendReversePattern);
    if (matches) {
      const receiverUsername = matches[1].substring(1); // Remove @ from username
      const token = matches[3];
      
      // If token is HBAR, handle specially by updating command
      const commandType = token === 'HBAR' ? 'TRANSFER_HBAR' : 'SEND';
      
      return {
        command: commandType,
        amount: matches[2],
        token: matches[3],
        receivers: [receiverUsername],
        receiver: receiverUsername, // Add receiver field for TRANSFER_HBAR compatibility
        elizaCommand: `Transfer ${matches[2]} ${matches[3]} to account ${receiverUsername}`,
        originalText: mentionText
      };
    }
  } else if (airdropPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(airdropPattern);
    if (matches) {
      const mentionRegex = /@[a-zA-Z0-9_]+/g;
      const mentionMatches = matches[3].match(mentionRegex);
      const receivers = mentionMatches ? mentionMatches.map(user => user.substring(1)) : [];
      
      return {
        command: 'AIRDROP',
        amount: matches[1],
        token: matches[2],
        receivers,
        elizaCommand: `Airdrop ${matches[1]} ${matches[2]} to ${receivers.join(', ')}`,
        originalText: mentionText
      };
    }
  } else if (registerPattern.test(textWithoutMention)) {
    // Register with specific account ID
    const matches = textWithoutMention.match(registerPattern);
    if (matches) {
      const accountId = matches[1];
      return {
        command: 'REGISTER',
        accountId,
        elizaCommand: `Register with Hedera account ${accountId}`,
        originalText: mentionText
      };
    }
  } else if (registerIntentPattern.test(textWithoutMention)) {
    // General registration intent without an account ID
    return {
      command: 'REGISTER_INTENT',
      elizaCommand: `Register new account`,
      originalText: mentionText
    };
  } else if (greetingPattern.test(textWithoutAnyMentions)) {
    // Handle greetings
    return {
      command: 'GREETING',
      elizaCommand: textWithoutAnyMentions.trim(),
      originalText: mentionText
    };
  } else if (createTokenPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(createTokenPattern);
    if (matches) {
      const tokenName = matches[1].trim();
      const tokenSymbol = matches[2].trim();
      const tokenDecimals = matches[3].trim();
      const initialSupply = matches[4].trim();
      
      // Check for optional parameters
      const isSupplyKey = /ADD\s+SUPPLY\s+KEY/i.test(textWithoutMention);
      const isAdminKey = /ADD\s+ADMIN\s+KEY/i.test(textWithoutMention);
      const isMetadataKey = /ADD\s+METADATA\s+KEY/i.test(textWithoutMention);
      
      // Check for memo
      let memo = undefined;
      const memoMatch = textWithoutMention.match(/SET\s+MEMO\s+(?:TO\s+)?['"]([^'"]+)['"]/i);
      if (memoMatch) {
        memo = memoMatch[1];
      }
      
      // Check for token metadata
      let tokenMetadata = undefined;
      const metadataMatch = textWithoutMention.match(/SET\s+(?:TOKEN\s+)?METADATA\s+(?:TO\s+)?['"]([^'"]+)['"]/i);
      if (metadataMatch) {
        tokenMetadata = metadataMatch[1];
      }
      
      // Construct Eliza command
      let elizaCommand = `Create token ${tokenName} with symbol ${tokenSymbol}, ${tokenDecimals} decimal places, and starting supply of ${initialSupply}`;
      
      if (isSupplyKey || isAdminKey || isMetadataKey) {
        elizaCommand += '. Add';
        if (isSupplyKey) elizaCommand += ' supply key';
        if (isAdminKey) elizaCommand += (isSupplyKey ? ',' : '') + ' admin key';
        if (isMetadataKey) elizaCommand += ((isSupplyKey || isAdminKey) ? ',' : '') + ' metadata key';
      }
      
      if (memo) {
        elizaCommand += `. Set memo to '${memo}'`;
      }
      
      if (tokenMetadata) {
        elizaCommand += `. Set token metadata to '${tokenMetadata}'`;
      }
      
      return {
        command: 'CREATE_TOKEN',
        tokenName,
        tokenSymbol,
        tokenDecimals,
        initialSupply,
        isSupplyKey,
        isAdminKey,
        isMetadataKey,
        memo,
        tokenMetadata,
        elizaCommand,
        originalText: mentionText
      };
    }
  } else if (balancePattern.test(textWithoutAnyMentions) || 
             simpleBalancePattern.test(textWithoutAnyMentions) ||
             /balance/i.test(textWithoutAnyMentions) ||
             /what is my balance/i.test(textWithoutAnyMentions)) {
    // More flexible token balance matching, including simple messages containing the word "balance"
    return {
      command: 'BALANCE',
      elizaCommand: 'Show me all my token balances',
      originalText: mentionText
    };
  } else if (hbarBalancePattern.test(textWithoutAnyMentions) || 
             simpleHbarBalancePattern.test(textWithoutAnyMentions) ||
             /hbar.*balance/i.test(textWithoutAnyMentions)) {
    // More flexible HBAR balance matching
    return {
      command: 'HBAR_BALANCE',
      elizaCommand: "What's my HBAR balance?",
      originalText: mentionText
    };
  } else if (tokenHoldersPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(tokenHoldersPattern);
    if (matches) {
      const tokenId = matches[1];
      const threshold = matches[2] ? parseInt(matches[2]) : undefined;
      
      return {
        command: 'TOKEN_HOLDERS',
        token: tokenId,
        threshold: threshold ? threshold.toString() : undefined,
        elizaCommand: threshold 
          ? `Show me the token holders for ${tokenId} with minimum balance equal ${threshold}`
          : `Show me the token holders for ${tokenId}`,
        originalText: mentionText
      };
    }
  } else if (mintTokenPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(mintTokenPattern);
    if (matches) {
      const amount = matches[1];
      const tokenId = matches[2];
      
      return {
        command: 'MINT_TOKEN',
        amount,
        token: tokenId,
        elizaCommand: `Mint ${amount} tokens ${tokenId}`,
        originalText: mentionText
      };
    }
  } else if (mintNftPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(mintNftPattern);
    if (matches) {
      const tokenId = matches[1];
      const metadata = matches[2] || '';
      
      return {
        command: 'MINT_NFT',
        token: tokenId,
        tokenMetadata: metadata,
        elizaCommand: `Mint NFT ${tokenId} with metadata '${metadata}'`,
        originalText: mentionText
      };
    }
  } else if (rejectTokenPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(rejectTokenPattern);
    if (matches) {
      const tokenId = matches[1];
      
      return {
        command: 'REJECT_TOKEN',
        token: tokenId,
        elizaCommand: `Reject token ${tokenId}`,
        originalText: mentionText
      };
    }
  } else if (associateTokenPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(associateTokenPattern);
    if (matches) {
      const tokenId = matches[1];
      
      return {
        command: 'ASSOCIATE_TOKEN',
        token: tokenId,
        elizaCommand: `Associate my wallet with token ${tokenId}`,
        originalText: mentionText
      };
    }
  } else if (dissociateTokenPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(dissociateTokenPattern);
    if (matches) {
      const tokenId = matches[1];
      
      return {
        command: 'DISSOCIATE_TOKEN',
        token: tokenId,
        elizaCommand: `Dissociate my wallet with token ${tokenId}`,
        originalText: mentionText
      };
    }
  } else if (transferHbarPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(transferHbarPattern);
    if (matches) {
      const amount = matches[1];
      const receiverAccount = matches[2];
      
      // Check if the receiver has an @ symbol (indicating Twitter username)
      // or if it doesn't contain a dot (likely a Twitter username without @)
      let receiverValue = receiverAccount;
      if (receiverAccount.startsWith('@')) {
        receiverValue = receiverAccount.substring(1); // Remove @ symbol
      }
      
      return {
        command: 'TRANSFER_HBAR',
        amount,
        receiver: receiverValue,
        elizaCommand: `Transfer ${amount} HBAR to account ${receiverValue}`,
        originalText: mentionText
      };
    }
  } else if (transferHbarReversePattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(transferHbarReversePattern);
    if (matches) {
      const receiverAccount = matches[1];
      const amount = matches[2];
      
      // Check if the receiver has an @ symbol (indicating Twitter username)
      // or if it doesn't contain a dot (likely a Twitter username without @)
      let receiverValue = receiverAccount;
      if (receiverAccount.startsWith('@')) {
        receiverValue = receiverAccount.substring(1); // Remove @ symbol
      }
      
      return {
        command: 'TRANSFER_HBAR',
        amount,
        receiver: receiverValue,
        elizaCommand: `Transfer ${amount} HBAR to account ${receiverValue}`,
        originalText: mentionText
      };
    }
  } else if (transferHtsPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(transferHtsPattern);
    if (matches) {
      const amount = matches[1];
      const tokenId = matches[2];
      const receiverAccount = matches[3];
      
      // Check if the receiver has an @ symbol (indicating Twitter username)
      // or if it doesn't contain a dot (likely a Twitter username without @)
      let receiverValue = receiverAccount;
      if (receiverAccount.startsWith('@')) {
        receiverValue = receiverAccount.substring(1); // Remove @ symbol
      }
      
      return {
        command: 'TRANSFER_HTS',
        amount,
        token: tokenId,
        receiver: receiverValue,
        elizaCommand: `Transfer ${amount} of ${tokenId} to account ${receiverValue}`,
        originalText: mentionText
      };
    }
  } else if (transferHtsReversePattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(transferHtsReversePattern);
    if (matches) {
      const receiverAccount = matches[1];
      const amount = matches[2];
      const tokenId = matches[3];
      
      // Check if the receiver has an @ symbol (indicating Twitter username)
      // or if it doesn't contain a dot (likely a Twitter username without @)
      let receiverValue = receiverAccount;
      if (receiverAccount.startsWith('@')) {
        receiverValue = receiverAccount.substring(1); // Remove @ symbol
      }
      
      return {
        command: 'TRANSFER_HTS',
        amount,
        token: tokenId,
        receiver: receiverValue,
        elizaCommand: `Transfer ${amount} of ${tokenId} to account ${receiverValue}`,
        originalText: mentionText
      };
    }
  } else if (claimAirdropPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(claimAirdropPattern);
    if (matches) {
      const tokenId = matches[1];
      const senderAccount = matches[2];
      
      return {
        command: 'CLAIM_AIRDROP',
        token: tokenId,
        sender: senderAccount,
        elizaCommand: `Claim airdrop of token ${tokenId} from account ${senderAccount}`,
        originalText: mentionText
      };
    }
  } else if (pendingAirdropPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(pendingAirdropPattern);
    const accountId = matches && matches[1] ? matches[1] : undefined;
    
    return {
      command: 'PENDING_AIRDROPS',
      accountId,
      elizaCommand: accountId 
        ? `Show pending airdrops for the account with id ${accountId}`
        : `Show your pending airdrops`,
      originalText: mentionText
    };
  } else if (getTopicInfoPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(getTopicInfoPattern);
    if (matches) {
      const topicId = matches[1];
      
      return {
        command: 'GET_TOPIC_INFO',
        topicId,
        elizaCommand: `Give me details about topic ${topicId}`,
        originalText: mentionText
      };
    }
  } else if (submitTopicMessagePattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(submitTopicMessagePattern);
    if (matches) {
      const message = matches[1];
      const topicId = matches[2];
      
      return {
        command: 'SUBMIT_TOPIC_MESSAGE',
        message,
        topicId,
        elizaCommand: `Submit message '${message}' to topic ${topicId}`,
        originalText: mentionText
      };
    }
  } else if (createTopicPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(createTopicPattern);
    if (matches) {
      const memo = matches[1];
      const submitKeyOption = matches[2] || '';
      const isSubmitKey = submitKeyOption.toLowerCase() === 'set' || submitKeyOption.toLowerCase().includes('set submit key');
      
      return {
        command: 'CREATE_TOPIC',
        memo,
        isSubmitKey,
        elizaCommand: `Create topic with memo: ${memo}${isSubmitKey ? '. Please set submit key' : ''}`,
        originalText: mentionText
      };
    }
  } else if (getTopicMessagesPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(getTopicMessagesPattern);
    if (matches) {
      const topicId = matches[1];
      const lowerThreshold = matches[2] ? matches[2].trim() : undefined;
      const upperThreshold = matches[3] ? matches[3].trim() : undefined;
      
      let elizaCommand = `Get messages from topic ${topicId}`;
      if (lowerThreshold) {
        elizaCommand += ` that were posted after ${lowerThreshold}`;
        if (upperThreshold) {
          elizaCommand += ` and before ${upperThreshold}`;
        }
      }
      
      return {
        command: 'GET_TOPIC_MESSAGES',
        topicId,
        lowerThreshold,
        upperThreshold,
        elizaCommand,
        originalText: mentionText
      };
    }
  } else if (deleteTopicPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(deleteTopicPattern);
    if (matches) {
      const topicId = matches[1];
      
      return {
        command: 'DELETE_TOPIC',
        topicId,
        elizaCommand: `Delete Topic with id ${topicId}`,
        originalText: mentionText
      };
    }
  }
  
  // Add a final catch-all pattern for send commands that might have been missed by other patterns
  else if (flexibleSendPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(flexibleSendPattern);
    if (matches) {
      const receiverUsername = matches[1].substring(1); // Remove @ from username
      const amount = matches[2];
      const token = matches[3];
      
      // If token is HBAR, handle specially by updating command
      const commandType = token === 'HBAR' ? 'TRANSFER_HBAR' : 'SEND';
      
      console.log(`Caught flexible send pattern: @${receiverUsername} ${amount} ${token}`);
      
      return {
        command: commandType,
        amount: amount,
        token: token,
        receivers: [receiverUsername],
        receiver: receiverUsername,
        elizaCommand: `Transfer ${amount} ${token} to account ${receiverUsername}`,
        originalText: mentionText
      };
    }
  }
  
  // More aggressive catch-all for send/transfer commands
  // This will try to extract Twitter username, amount, and token from almost any format
  const twitterHandleMatch = textWithoutMention.match(/@([a-zA-Z0-9_]+)/);
  const amountMatch = textWithoutMention.match(/(\d+(?:\.\d+)?)/);
  const tokenMatch = textWithoutMention.match(/\b(HBAR|[A-Z]{3,})\b/);

  if (twitterHandleMatch && amountMatch && tokenMatch && 
      /\b(?:send|transfer)\b/i.test(textWithoutMention)) {
    
    const receiverUsername = twitterHandleMatch[1];
    const amount = amountMatch[1];
    const token = tokenMatch[1];
    
    // If token is HBAR, handle specially by updating command
    const commandType = token === 'HBAR' ? 'TRANSFER_HBAR' : 'SEND';
    
    console.log(`Caught super flexible send pattern: @${receiverUsername} ${amount} ${token}`);
    
    return {
      command: commandType,
      amount: amount,
      token: token,
      receivers: [receiverUsername],
      receiver: receiverUsername,
      elizaCommand: `Transfer ${amount} ${token} to account ${receiverUsername}`,
      originalText: mentionText
    };
  }
  
  // If no pattern matched, return default
  return defaultReturn;
}

/**
 * Post a reply to a tweet
 * 
 * @param tweetId - The ID of the tweet to reply to
 * @param text - The text of the reply
 * @returns Response from Twitter API
 */
export async function replyToTweet(tweetId: string, text: string): Promise<any> {
  try {
    console.log(`Posting reply to tweet ${tweetId}: ${text}`);
    
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      throw new Error('Twitter client not initialized');
      }
      
    // Using agent-twitter-client's sendQuoteTweet for replies
    return await twitterClient.sendQuoteTweet(text, tweetId);
  } catch (error) {
    console.error('Error posting tweet reply:', error);
    throw error;
  }
}


/**
 * Get recent mentions of the bot account (from the last 5 minutes)
 * @returns Array of mention tweets
 */
export async function getRecentMentions(): Promise<any[]> {
  try {
    const twitterClient = getTwitterClient();
    if (!twitterClient) {
      throw new Error('Twitter client not initialized');
    }
    
    // Using agent-twitter-client to get tweets and replies
    const botUsername = process.env.TWITTER_BOT_USERNAME || 'HederaPayBot';
    
    console.log(`Fetching recent tweets mentioning @${botUsername}`);
    
    // Using search method to find mentions
    // Collect all tweets from the AsyncGenerator into an array
    const searchResults = [];
    const mentionsGenerator = twitterClient.searchTweets(`@${botUsername}`, 20,SearchMode.Latest);
    
    for await (const tweet of mentionsGenerator) {
      // Get the created_at date with more robust extraction
      console.log("tweet",tweet)
      const tweetAny = tweet as any;
      
      // Try different paths to find the timestamp in the tweet object
      let createdAtStr: string | null = null;
      
      // Check for string formatted date (ISO format)
      if (typeof tweetAny.created_at === 'string') {
        createdAtStr = tweetAny.created_at;
      } else if (typeof tweetAny.createdAt === 'string') {
        createdAtStr = tweetAny.createdAt;
      } 
      // Check for REST response format
      else if (tweetAny.rest && tweetAny.rest.created_at) {
        createdAtStr = tweetAny.rest.created_at;
      }
      // Check for timestamp in milliseconds/seconds
      else if (typeof tweetAny.timestamp === 'number') {
        // Convert timestamp to ISO string (handle both seconds and milliseconds formats)
        const timestamp = tweetAny.timestamp > 10000000000 
          ? tweetAny.timestamp // already in milliseconds
          : tweetAny.timestamp * 1000; // convert from seconds to milliseconds
        
        createdAtStr = new Date(timestamp).toISOString();
      }
      
      // If we still don't have a date, log the issue and use current time
      if (!createdAtStr) {
        console.warn(`Could not find created_at timestamp in tweet object. Using current time.`);
        console.warn(`Tweet object keys: ${Object.keys(tweetAny).join(', ')}`);
        if (tweetAny.rest) {
          console.warn(`Tweet.rest keys: ${Object.keys(tweetAny.rest).join(', ')}`);
        }
        createdAtStr = new Date().toISOString();
      }
      
      const tweetDate = new Date(createdAtStr);
      
      // Add tweet info to log with more detailed timestamp
      const id = tweetAny.id_str || tweetAny.id || 
                (tweetAny.rest ? tweetAny.rest.id_str : null) || 
                'unknown';
                
      console.log(`Found tweet ${id} from ${tweetDate.toISOString()} (${new Date().getTime() - tweetDate.getTime()}ms ago)`);
      
      // Store the parsed date directly in the tweet object for easier filtering later
      tweetAny._parsedCreatedAt = tweetDate;
      
      searchResults.push(tweet);
      if (searchResults.length >= 30) break; // Limit to 30 tweets
    }
    
    return searchResults;
  } catch (error) {
    console.error('Error getting recent mentions:', error);
    return [];
  }
}

/**
 * Check if text is a balance-related query
 * This function provides better detection for balance requests
 * 
 * @param text - Text to check for balance query
 * @returns Object indicating if it's a balance query and what type
 */
export function isBalanceQuery(text: string): { isBalanceQuery: boolean; type: 'ALL' | 'HBAR' | 'TOKEN' | 'NONE'; tokenId?: string } {
  // Remove @mentions and clean up text
  const cleanText = text.replace(/@\w+/g, '').trim().toLowerCase();
  
  // Common balance query patterns
  const generalBalancePatterns = [
    /(?:what(?:'?s| is))?(?:\s+my|\s+the)?\s+(?:token\s+)?balance(?:s)?/i,
    /show\s+(?:me\s+)?(?:my\s+)?(?:token\s+)?balance(?:s)?/i,
    /check\s+(?:my\s+)?(?:token\s+)?balance(?:s)?/i,
    /display\s+(?:my\s+)?(?:token\s+)?balance(?:s)?/i,
    /get\s+(?:my\s+)?(?:token\s+)?balance(?:s)?/i,
    /^balance(?:s)?$/i,
    /^my\s+balance(?:s)?$/i,
    /^token\s+balance(?:s)?$/i
  ];
  
  // HBAR specific balance patterns
  const hbarBalancePatterns = [
    /(?:what(?:'?s| is))?(?:\s+my|\s+the)?\s+hbar\s+balance/i,
    /show\s+(?:me\s+)?(?:my\s+)?hbar\s+balance/i,
    /check\s+(?:my\s+)?hbar\s+balance/i,
    /display\s+(?:my\s+)?hbar\s+balance/i,
    /get\s+(?:my\s+)?hbar\s+balance/i,
    /^hbar\s+balance$/i,
    /^my\s+hbar\s+balance$/i
  ];
  
  // Specific token balance patterns
  const specificTokenPattern = /(?:what(?:'?s| is))?(?:\s+my|\s+the)?\s+balance\s+(?:for|of)\s+token\s+([0-9.]+)/i;
  const tokenIdMatch = cleanText.match(specificTokenPattern);
  
  // Check patterns
  const isGeneralBalance = generalBalancePatterns.some(pattern => pattern.test(cleanText));
  const isHbarBalance = hbarBalancePatterns.some(pattern => pattern.test(cleanText));
  const isSpecificToken = tokenIdMatch !== null;
  
  // Determine the type of balance query
  if (isHbarBalance) {
    return { isBalanceQuery: true, type: 'HBAR' };
  } else if (isSpecificToken && tokenIdMatch) {
    return { isBalanceQuery: true, type: 'TOKEN', tokenId: tokenIdMatch[1] };
  } else if (isGeneralBalance) {
    return { isBalanceQuery: true, type: 'ALL' };
  }
  
  return { isBalanceQuery: false, type: 'NONE' };
}

/**
 * Generate appropriate balance response based on query type
 * 
 * @param twitterUsername - Twitter username 
 * @param queryType - Type of balance query
 * @param tokenId - Optional token ID for specific token balance
 * @returns Formatted balance response
 */
export async function generateBalanceResponse(
  twitterUsername: string, 
  queryType: 'ALL' | 'HBAR' | 'TOKEN',
  tokenId?: string
): Promise<string> {
  // Import the Eliza service

  
  try {
    let balanceCommand = '';
    
    switch (queryType) {
      case 'ALL':
        balanceCommand = 'Show me all my token balances';
        break;
      case 'HBAR':
        balanceCommand = "What's my HBAR balance?";
        break;
      case 'TOKEN':
        balanceCommand = `What's my balance for token ${tokenId}?`;
        break;
    }
  
    const userInfo=await userService.getUserByTwitterUsername(twitterUsername);
    const userId = userInfo?.twitter_id;
    const userName = userInfo?.twitter_username;
    // Get balance response from Eliza with all required parameters: command, userId, userName
    const response = await sendCommandToEliza(balanceCommand, userId, userName);
    
    // Format the response for Twitter if needed
    if (Array.isArray(response)) {
      return formatElizaResponseForTwitter(response);
    }
    
    // If response is already a string, return it directly
    return typeof response === 'string' ? response : JSON.stringify(response);
  } catch (error) {
    console.error('Error generating balance response:', error);
    return "I'm sorry, I couldn't retrieve your balance information at this time.";
  }
}

// Simplified approach to storing processed tweets
// Use a Map with tweet ID as key and processed time as value
const processedTweets = new Map<string, number>();
const MAX_PROCESSED_TWEETS = 10000;

/**
 * Check if a tweet has been processed before
 * @param tweetId - ID of the tweet to check
 * @returns True if tweet has been processed recently
 */
export async function hasBeenProcessed(tweetId: string): Promise<boolean> {
  if (!tweetId) {
    console.warn('Checking undefined tweet ID');
    return false;
  }

  // Check if this specific tweet is in our cache
  if (processedTweets.has(tweetId)) {
    console.log(`Tweet ${tweetId} was already processed - skipping`);
    return true;
  }
  
  console.log(`Tweet ${tweetId} has not been processed before - will process`);
  return false;
}

/**
 * Force a tweet to be reprocessed by removing it from the processed list
 * @param tweetId - ID of the tweet to force reprocess
 * @returns True if the tweet was in the processed list and was removed
 */
export async function forceReprocessTweet(tweetId: string): Promise<boolean> {
  if (!tweetId) return false;
  
  const wasProcessed = processedTweets.has(tweetId);
  if (wasProcessed) {
    processedTweets.delete(tweetId);
    console.log(`Forced reprocessing of tweet ${tweetId}`);
  }
  return wasProcessed;
}

/**
 * Mark a tweet as processed
 * @param tweetId - ID of the tweet to mark as processed
 * @param skipped - Optional flag to indicate if tweet was skipped
 */
export async function markAsProcessed(tweetId: string, skipped: boolean = false): Promise<void> {
  if (!tweetId) return;
  
  // Store the current timestamp with the tweet ID
  processedTweets.set(tweetId, Date.now());
  console.log(`Marked tweet ${tweetId} as processed${skipped ? ' (skipped)' : ''}`);
  
  // If we have too many tweets, remove the oldest ones
  if (processedTweets.size > MAX_PROCESSED_TWEETS) {
    // Sort by timestamp (oldest first) and remove 20% of the oldest entries
    const sortedEntries = [...processedTweets.entries()]
      .sort((a, b) => a[1] - b[1]);
    
    const entriesToRemove = Math.max(1, Math.floor(MAX_PROCESSED_TWEETS * 0.2));
    for (let i = 0; i < entriesToRemove; i++) {
      if (i < sortedEntries.length) {
        processedTweets.delete(sortedEntries[i][0]);
      }
    }
    
    console.log(`Removed ${entriesToRemove} oldest entries due to cache limit. New size: ${processedTweets.size}`);
  }
}

// Filter for recent mentions - no time filtering
export async function filterRecentMentions(mentions: any[]): Promise<any[]> {
  if (!mentions || mentions.length === 0) {
    return [];
  }
  
  // Get current server time for logging
  const serverTime = new Date();
  console.log(`Server current time: ${serverTime.toISOString()}`);
  console.log(`Processing all ${mentions.length} tweets regardless of age`);
  
  // Process each tweet to extract proper timestamps (for logging purposes)
  mentions.forEach(mention => {
    const tweetAny = mention as any;
    
    // First try to extract created_at from common locations
    let createdAtStr = tweetAny.created_at || tweetAny.createdAt;
    
    // Then look in nested properties
    if (!createdAtStr && tweetAny.rest && tweetAny.rest.created_at) {
      createdAtStr = tweetAny.rest.created_at;
    }
    
    // Try to find the timestamp in even more deeply nested objects
    if (!createdAtStr && tweetAny.data && tweetAny.data.created_at) {
      createdAtStr = tweetAny.data.created_at;
    }
    
    // Check for timestamp in milliseconds/seconds format
    if (!createdAtStr && (typeof tweetAny.timestamp === 'number' || typeof tweetAny.time === 'number')) {
      // Convert timestamp to ISO string (handle both seconds and milliseconds formats)
      const timestamp = (tweetAny.timestamp || tweetAny.time) > 10000000000 
        ? (tweetAny.timestamp || tweetAny.time) // already in milliseconds
        : (tweetAny.timestamp || tweetAny.time) * 1000; // convert from seconds to milliseconds
      
      createdAtStr = new Date(timestamp).toISOString();
      console.log(`Used numeric timestamp: ${timestamp} -> ${createdAtStr}`);
    }
    
    // If tweet id contains creation time info (Twitter IDs encode creation time)
    if (!createdAtStr && (tweetAny.id_str || tweetAny.id)) {
      try {
        // Twitter snowflake IDs: First 41 bits are timestamp (ms since 2010-11-04)
        const tweetId = tweetAny.id_str || tweetAny.id;
        if (tweetId && tweetId.length > 15) { // Only try for likely Twitter IDs
          const snowflakeTimestampMs = Number(BigInt(tweetId) >> 22n) + 1288834974657; // Twitter epoch
          if (!isNaN(snowflakeTimestampMs) && snowflakeTimestampMs > 1000000000000) {
            createdAtStr = new Date(snowflakeTimestampMs).toISOString();
            console.log(`Extracted date from tweet ID: ${createdAtStr}`);
          }
        }
      } catch (e) {
        console.warn('Failed to extract date from tweet ID, using fallback', e);
      }
    }
    
    // Last resort: use current time with small offset to ensure it's processed
    if (!createdAtStr) {
      console.warn(`Could not find created_at timestamp in tweet. Using current time minus 5 minutes.`);
      const fiveMinutesAgo = new Date(serverTime.getTime() - (5 * 60 * 1000));
      createdAtStr = fiveMinutesAgo.toISOString();
    }
    
    // Create a proper date object
    let mentionDate: Date;
    try {
      mentionDate = new Date(createdAtStr);
      if (isNaN(mentionDate.getTime())) {
        // If date is invalid, use current time minus 5 minutes as fallback
        console.warn(`Invalid date format: "${createdAtStr}", using current time minus 5 minutes`);
        mentionDate = new Date(serverTime.getTime() - (5 * 60 * 1000));
      }
    } catch (e) {
      console.warn(`Error parsing date: "${createdAtStr}", using current time minus 5 minutes`, e);
      mentionDate = new Date(serverTime.getTime() - (5 * 60 * 1000));
    }
    
    // Store the parsed date for use in the controller
    tweetAny._parsedCreatedAt = mentionDate;
    
    // Log the tweet info but don't filter by date
    console.log(`Tweet ID: ${tweetAny.id_str || tweetAny.id}, Date: ${mentionDate.toISOString()}`);
  });
  
  // Return all mentions without filtering by age
  return mentions;
} 