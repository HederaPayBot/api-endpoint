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
  const transferHbarPattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(\d+(?:\.\d+)?)\s+HBAR\s+TO\s+(?:ACCOUNT\s+)?([0-9.]+)/i;
  const transferHtsPattern = /(?:TRANSFER|SEND|MAKE\s+A\s+TRANSACTION\s+OF)\s+(\d+(?:\.\d+)?)\s+(?:OF|TOKENS|TOKEN)?\s+([0-9.]+)\s+TO\s+(?:ACCOUNT\s+)?([0-9.]+)/i;
  const claimAirdropPattern = /(?:CLAIM|ACCEPT)\s+AIRDROP\s+(?:OF\s+)?(?:TOKEN\s+)?([0-9.]+)\s+FROM\s+(?:ACCOUNT\s+)?([0-9.]+)/i;
  const pendingAirdropPattern = /SHOW\s+PENDING\s+AIRDROPS(?:\s+FOR\s+(?:THE\s+)?(?:ACCOUNT\s+)?(?:WITH\s+ID\s+)?([0-9.]+))?/i;
  
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
      
      return {
        command: 'SEND',
        amount: matches[1],
        token: matches[2],
        receivers: [receiverUsername], 
        elizaCommand: `Transfer ${matches[1]} ${matches[2]} to account ${receiverUsername}`,
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
      
      return {
        command: 'TRANSFER_HBAR',
        amount,
        receiver: receiverAccount,
        elizaCommand: `Transfer ${amount} HBAR to account ${receiverAccount}`,
        originalText: mentionText
      };
    }
  } else if (transferHtsPattern.test(textWithoutMention)) {
    const matches = textWithoutMention.match(transferHtsPattern);
    if (matches) {
      const amount = matches[1];
      const tokenId = matches[2];
      const receiverAccount = matches[3];
      
      return {
        command: 'TRANSFER_HTS',
        amount,
        token: tokenId,
        receiver: receiverAccount,
        elizaCommand: `Transfer ${amount} of ${tokenId} to account ${receiverAccount}`,
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
    
    console.log(`Fetching recent tweets mentioning @${botUsername} (last 5 minutes only)`);
    
    // Using search method to find mentions
    // Collect all tweets from the AsyncGenerator into an array
    const searchResults = [];
    const mentionsGenerator = twitterClient.searchTweets(`@${botUsername}`, 20);
    
    for await (const tweet of mentionsGenerator) {
      // Get the created_at date - use any type to avoid linter errors
      const tweetAny = tweet as any;
      const createdAt = tweetAny.created_at || tweetAny.createdAt || new Date().toISOString();
      const tweetDate = new Date(createdAt);
      
      // Add tweet info to log
      const id = tweetAny.id_str || tweetAny.id || 
                (tweetAny.rest ? tweetAny.rest.id_str : null) || 
                'unknown';
      console.log(`Found tweet ${id} from ${tweetDate.toISOString()}`);
      
      searchResults.push(tweet);
      if (searchResults.length >= 20) break; // Limit to 20 tweets
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

// Store recently processed tweet IDs to avoid duplicates
// Changed from simple Set to Map to store timestamp with each tweet ID
const processedTweets = new Map<string, number>();
const MAX_PROCESSED_TWEETS = 1000; // Limit the size of the processed tweets set
const TWEET_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds (reduced for testing)

/**
 * Check if a tweet has been processed before
 * @param tweetId - ID of the tweet to check
 * @returns True if tweet has been processed before and hasn't expired
 */
export async function hasBeenProcessed(tweetId: string): Promise<boolean> {
  // Remove expired entries before checking
  cleanExpiredTweets();
  
  // Check if tweet exists in the map and hasn't expired
  const isProcessed = processedTweets.has(tweetId);
  
  if (isProcessed) {
    const processedTime = new Date(processedTweets.get(tweetId)!).toISOString();
    const elapsedMs = Date.now() - processedTweets.get(tweetId)!;
    const expiresInMs = Math.max(0, TWEET_EXPIRATION_MS - elapsedMs);
    console.log(`Tweet ${tweetId} was already processed at ${processedTime} - skipping (expires in ${Math.round(expiresInMs/1000)} seconds)`);
  } else {
    console.log(`Tweet ${tweetId} has not been processed before or has expired`);
  }
  
  return isProcessed;
}

/**
 * Force a tweet to be reprocessed by removing it from the processed list
 * @param tweetId - ID of the tweet to force reprocess
 * @returns True if the tweet was in the processed list and was removed
 */
export async function forceReprocessTweet(tweetId: string): Promise<boolean> {
  const wasProcessed = processedTweets.has(tweetId);
  if (wasProcessed) {
    processedTweets.delete(tweetId);
    console.log(`Forced reprocessing of tweet ${tweetId} by removing from processed list`);
  }
  return wasProcessed;
}

/**
 * Mark a tweet as processed
 * @param tweetId - ID of the tweet to mark as processed
 * @param skipped - Optional flag to indicate if tweet was skipped due to command filtering
 */
export async function markAsProcessed(tweetId: string, skipped: boolean = false): Promise<void> {
  // Store the current timestamp with the tweet ID
  const now = Date.now();
  processedTweets.set(tweetId, now);
  console.log(`Marked tweet ${tweetId} as processed at ${new Date(now).toISOString()}${skipped ? ' (skipped due to command filtering)' : ''}`);
  
  // If we have too many tweets, remove the oldest ones
  if (processedTweets.size > MAX_PROCESSED_TWEETS) {
    const oldestTweet = [...processedTweets.entries()]
      .sort((a, b) => a[1] - b[1])[0][0];
    processedTweets.delete(oldestTweet);
    console.log(`Removed oldest tweet ${oldestTweet} due to maximum capacity (${MAX_PROCESSED_TWEETS})`);
  }
}

/**
 * Clean expired tweets from the processed tweets map
 */
function cleanExpiredTweets(): void {
  const now = Date.now();
  const beforeCount = processedTweets.size;
  let expiredCount = 0;
  
  for (const [tweetId, timestamp] of processedTweets.entries()) {
    const ageMs = now - timestamp;
    if (ageMs > TWEET_EXPIRATION_MS) {
      processedTweets.delete(tweetId);
      expiredCount++;
      console.log(`Tweet ${tweetId} expired (age: ${Math.round(ageMs/1000/60)} minutes) - removed from processed list`);
    }
  }
  
  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired tweets. Before: ${beforeCount}, After: ${processedTweets.size}`);
  }
}



// Filter for recent mentions (last 5 minutes only)
export async function filterRecentMentions(mentions: any[]): Promise<any[]> {
  if (!mentions || mentions.length === 0) {
    return [];
  }
  
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5); // 5 minutes ago
  
  console.log(`Filtering tweets: only processing tweets newer than ${fiveMinutesAgo.toISOString()}`);
  
  const filteredMentions = mentions.filter(mention => {
    // Get the created_at date, handling different API formats
    const createdAt = mention.created_at || mention.createdAt || new Date().toISOString();
    const mentionDate = new Date(createdAt);
    
    const isRecent = mentionDate >= fiveMinutesAgo;
    
    if (!isRecent) {
      console.log(`Skipping old tweet from ${mentionDate.toISOString()} - older than 5 minutes cutoff`);
    } else {
      console.log(`Including recent tweet from ${mentionDate.toISOString()}`);
    }
    
    // Only include mentions from the last 5 minutes
    return isRecent;
  });
  
  console.log(`Filtered ${mentions.length} tweets down to ${filteredMentions.length} within the last 5 minutes`);
  
  return filteredMentions;
} 