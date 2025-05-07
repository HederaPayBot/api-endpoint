import { Request, Response } from 'express';
import { 
  parseTwitterMention, 
  replyToTweet, 
  getRecentMentions as fetchRecentMentions,
  isBalanceQuery,
  generateBalanceResponse,
  hasBeenProcessed,
  markAsProcessed,
  filterRecentMentions,
  ParsedCommand,
  forceReprocessTweet
} from '../services/twitterService';
import { 
  getHederaAccountFromTwitter
} from '../services/elizaService';
import { createAccountForTwitterUser } from '../services/hederaAccountService';
import { Tweet } from '../services/types';
import {
  handleSendCommand,
  handleBalanceCommand,
  handleHbarBalanceCommand,
  handleCreateTokenCommand,
  handleAirdropCommand,
  handleTokenHoldersCommand,
  handleMintTokenCommand,
  handleMintNftCommand,
  handleRejectTokenCommand,
  handleAssociateTokenCommand,
  handleDissociateTokenCommand,
  handleTransferHbarCommand,
  handleTransferHtsCommand,
  handleClaimAirdropCommand,
  handlePendingAirdropsCommand,
  handleGetTopicInfoCommand,
  handleSubmitTopicMessageCommand,
  handleCreateTopicCommand,
  handleGetTopicMessagesCommand,
  handleDeleteTopicCommand
} from '../services/commandHandlers';

// Twitter controller
// These endpoints handle Twitter API interactions

/**
 * @api {get} /api/twitter/poll-mentions Poll for recent mentions and process them
 * @apiName PollMentions
 * @apiGroup Twitter
 * @apiDescription Poll for recent mentions and process them
 * This replaces the webhook functionality with a polling approach
 * 
 * @apiSuccess {Object} response Information about processed mentions
 */
export const processMentions = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get recent mentions
    const mentions = await fetchRecentMentions();
    
    if (!mentions || mentions.length === 0) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'No new mentions found',
        processed: 0
      });
    }
    
    // Filter to only include mentions from the last 5 minutes
    const recentMentions = await filterRecentMentions(mentions);
    
    if (recentMentions.length === 0) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'No new mentions found to process',
        processed: 0
      });
    }
    
    console.log(`Processing ${recentMentions.length} mentions...`);
    
    let processed = 0;
    const errors: any[] = [];
    
    // Sort mentions by creation date (oldest first) to process in chronological order
    const sortedMentions = [...recentMentions].sort((a, b) => {
      const dateA = a.created_at || new Date().toISOString();
      const dateB = b.created_at || new Date().toISOString();
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    // Process each mention
    for (const mention of sortedMentions) {
      if (!mention) {
        console.log('Skipping undefined mention');
        continue;
      }
      
      try {
        // Access properties safely with defaults
        const id = mention.id_str || mention.id || 'unknown';
        const createdAt = mention.created_at || new Date().toISOString();
        
        // Get date from the pre-processed value (from filterRecentMentions) if available
        // This avoids duplicate date parsing logic
        let tweetDate: Date;
        if (mention._parsedCreatedAt instanceof Date) {
          tweetDate = mention._parsedCreatedAt;
          console.log(`Using pre-parsed date from twitterService: ${tweetDate.toISOString()}`);
        } else {
          try {
            tweetDate = new Date(createdAt);
            if (isNaN(tweetDate.getTime())) {
              // If date is invalid, use current time minus 5 minutes as fallback
              console.warn(`Invalid tweet date "${createdAt}" for tweet ${id}, using fallback`);
              const serverTime = new Date();
              tweetDate = new Date(serverTime.getTime() - (5 * 60 * 1000));
            }
          } catch (e) {
            console.warn(`Error parsing tweet date "${createdAt}" for tweet ${id}, using fallback`, e);
            const serverTime = new Date();
            tweetDate = new Date(serverTime.getTime() - (5 * 60 * 1000));
          }
        }
        
        // Log time information for debugging
        const serverTime = new Date();
        console.log(`Tweet ${id} date: ${tweetDate.toISOString()}, Server time: ${serverTime.toISOString()}`);
        
        if (!id) {
          console.log('Skipping mention with no ID:', mention);
          continue;
        }
        
        // Skip if we've already processed this tweet
        if (await hasBeenProcessed(id)) {
          console.log(`Skipping already processed tweet ${id}`);
          continue;
        }
        
        // Extract text safely from various possible locations
        const tweetText = mention.text || mention.full_text || '';
        
        // Log raw tweet text for debugging
        console.log(`Raw tweet text: "${tweetText}"`);
        
        // Convert to the format expected by processTweetEvent
        const tweetEvent = {
          id_str: id,
          text: tweetText,
          user: {
            id_str: mention.user?.id_str || mention.userId || 'unknown',
            screen_name: mention.user?.screen_name || mention.username || 'unknown'
          },
          in_reply_to_status_id_str: mention.inReplyToStatusId
        };
        
        // Validate the screen_name is available
        if (tweetEvent.user.screen_name === 'unknown') {
          console.warn(`Could not determine username for tweet ${id}, attempting to extract from tweet text`);
          
          // Try to extract from tweet text if it contains a handle
          const handleMatch = tweetText.match(/@([a-zA-Z0-9_]+)/);
          if (handleMatch && handleMatch[1]) {
            tweetEvent.user.screen_name = handleMatch[1];
            console.log(`Extracted username "${tweetEvent.user.screen_name}" from tweet text`);
          }
        }
        
        // Check if this is a valid mention with bot username
        const botUsername = process.env.TWITTER_BOT_USERNAME || 'HederaPayBot';
        if (!tweetEvent.text.toLowerCase().includes(`@${botUsername.toLowerCase()}`)) {
          console.log(`Skipping tweet ${id} - Not mentioning @${botUsername}`);
          await markAsProcessed(id); // Mark as processed to avoid checking again
          continue;
        }
        
        // Parse the mention into a structured command
        const parsedCommand = parseTwitterMention(tweetEvent.text);
        console.log(`Tweet ${id} parsed as command type: ${parsedCommand.command}`);
        
        // Process broader range of commands
        const commonCommands = [
          'SEND', 'BALANCE', 'HBAR_BALANCE', 'CREATE_TOKEN', 'AIRDROP', 
          'REGISTER', 'TOKEN_HOLDERS', 'MINT_TOKEN', 'MINT_NFT', 
          'REJECT_TOKEN', 'ASSOCIATE_TOKEN', 'DISSOCIATE_TOKEN', 
          'TRANSFER_HBAR', 'TRANSFER_HTS', 'CLAIM_AIRDROP', 
          'PENDING_AIRDROPS', 'GET_TOPIC_INFO', 'SUBMIT_TOPIC_MESSAGE', 
          'CREATE_TOPIC', 'GET_TOPIC_MESSAGES', 'DELETE_TOPIC',
          'GREETING', 'UNKNOWN', 'REGISTER_INTENT'
        ];
        
        // Check for force processing flag in request
        const forceProcess = req.query.force === 'true';
        
        // Always process if:
        // 1. It's a recognized command OR
        // 2. It's a balance query OR
        // 3. Force processing is enabled
        if (!commonCommands.includes(parsedCommand.command) && 
            !isBalanceQuery(tweetEvent.text).isBalanceQuery && 
            !forceProcess) {
          console.log(`Skipping tweet ${id} - Not a recognized command type and force=false`);
          
          // Important: Only mark as processed if skipping due to command type
          // This way time-based expiration will still work for these tweets
          await markAsProcessed(id, true); // Second parameter indicates skipped due to command type
          continue;  
        }
        
        await processTweetEvent(tweetEvent);
        processed++;
        
        // Mark as processed
        await markAsProcessed(id);
      } catch (error) {
        console.error(`Error processing mention:`, error);
        errors.push({
          error: error.message || 'Unknown error'
        });
      }
    }
    
    return res.status(200).json({
      status: 'success',
      processed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error polling for mentions:', error);
    return res.status(500).json({ 
      error: 'Failed to poll for mentions',
      message: error.message
    });
  }
};

// Tweet event types
interface TwitterUser {
  id_str: string;
  screen_name: string;
}

interface TweetEvent {
  id_str: string;
  text: string;
  user: TwitterUser;
  in_reply_to_status_id_str?: string;
}

/**
 * Process a tweet event asynchronously
 * This function handles the core logic of processing Twitter mentions
 */
async function processTweetEvent(tweetEvent: TweetEvent): Promise<void> {
  try {
    if (!shouldProcessTweet(tweetEvent)) {
      console.log(`Skipping tweet: ${tweetEvent.id_str} - Not relevant for processing`);
      return;
    }
    
    console.log(`Processing tweet: ${tweetEvent.text} from @${tweetEvent.user.screen_name}`);
    
    // Check if the user is registered with a Hedera account
    const hederaAccount = getHederaAccountFromTwitter(tweetEvent.user.screen_name);
    
    // Check for balance queries directly using our improved detection
    const balanceCheck = isBalanceQuery(tweetEvent.text);
    
    if (balanceCheck.isBalanceQuery && balanceCheck.type !== 'NONE') {
      console.log(`Detected balance query of type: ${balanceCheck.type}`);
      
      // If user isn't registered, tell them to register first
      if (!hederaAccount) {
        await replyToTweet(
          tweetEvent.id_str,
          `@${tweetEvent.user.screen_name} You need to register your Hedera account first to check balances. Please use the "register [accountId]" command.`
        );
        return;
      }
      
      // Generate balance response using our specialized function
      const balanceResponse = await generateBalanceResponse(
        tweetEvent.user.screen_name,
        balanceCheck.type,
        balanceCheck.tokenId
      );
      
      // Send response directly
      await replyToTweet(
        tweetEvent.id_str,
        `@${tweetEvent.user.screen_name} ${balanceResponse}`
      );
      
      console.log(`Processed balance query for tweet ${tweetEvent.id_str}`);
      return;
    }
    
    // Parse the mention into a structured command
    const parsedCommand = parseTwitterMention(tweetEvent.text);
    console.log('Parsed command:', JSON.stringify(parsedCommand));
    
    // Handle registration command specially
    if (parsedCommand.command === 'REGISTER') {
      // Instead of going through processSpecialCommand which expects an account ID,
      // create a Hedera account directly for the user
      try {
        const result = await createAccountForTwitterUser(
          tweetEvent.user.screen_name,
          tweetEvent.user.id_str,
          10 // Give them 10 HBAR initial balance
        );

        if (result.success) {
          await replyToTweet(
            tweetEvent.id_str,
            `@${tweetEvent.user.screen_name} ${result.message}`
          );
        } else {
          await replyToTweet(
            tweetEvent.id_str,
            `@${tweetEvent.user.screen_name} ${result.message}`
          );
        }
        
        console.log(`Created Hedera account for user "${tweetEvent.user.screen_name}" via REGISTER command`);
        return;
      } catch (error) {
        console.error('Error creating Hedera account:', error);
        await replyToTweet(
          tweetEvent.id_str,
          `@${tweetEvent.user.screen_name} Sorry, I couldn't create a Hedera account for you right now. Please try again later.`
        );
        return;
      }
    }
    
    // Handle registration intent (when user wants to register but doesn't provide an account ID)
    if (parsedCommand.command === 'REGISTER_INTENT') {
      // Create a Hedera account for the user automatically
      try {
        const result = await createAccountForTwitterUser(
          tweetEvent.user.screen_name,
          tweetEvent.user.id_str,
          10 // Give them 10 HBAR initial balance
        );

        if (result.success) {
          await replyToTweet(
            tweetEvent.id_str,
            `@${tweetEvent.user.screen_name} ${result.message}`
          );
        } else {
          await replyToTweet(
            tweetEvent.id_str,
            `@${tweetEvent.user.screen_name} ${result.message}`
          );
        }
        
        console.log(`Created Hedera account for user "${tweetEvent.user.screen_name}" via REGISTER_INTENT command`);
        return;
      } catch (error) {
        console.error('Error creating Hedera account:', error);
        await replyToTweet(
          tweetEvent.id_str,
          `@${tweetEvent.user.screen_name} Sorry, I couldn't create a Hedera account for you right now. Please try again later.`
        );
        return;
      }
    }
    
    // For all other commands, check if user is registered first
    if (!hederaAccount && !['REGISTER', 'REGISTER_INTENT', 'GREETING'].includes(parsedCommand.command)) {
      await replyToTweet(
        tweetEvent.id_str,
        `@${tweetEvent.user.screen_name} You need to register your Hedera account first. Please use the "register [accountId]" command to get started.`
      );
      console.log(`User ${tweetEvent.user.screen_name} not registered, asking to register`);
      return;
    }
    
    
    // Process the command based on type
    let response: string | null = null;
    
    switch (parsedCommand.command) {
      case 'SEND':
        response = await handleSendCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'BALANCE':
        response = await handleBalanceCommand(tweetEvent.user.screen_name);
        break;
        
      case 'HBAR_BALANCE':
        response = await handleHbarBalanceCommand(tweetEvent.user.screen_name);
        break;
        
      case 'CREATE_TOKEN':
        response = await handleCreateTokenCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'AIRDROP':
        response = await handleAirdropCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
      
      case 'TOKEN_HOLDERS':
        response = await handleTokenHoldersCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'MINT_TOKEN':
        response = await handleMintTokenCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'MINT_NFT':
        response = await handleMintNftCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'REJECT_TOKEN':
        response = await handleRejectTokenCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'ASSOCIATE_TOKEN':
        response = await handleAssociateTokenCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'DISSOCIATE_TOKEN':
        response = await handleDissociateTokenCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'TRANSFER_HBAR':
        response = await handleTransferHbarCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'TRANSFER_HTS':
        response = await handleTransferHtsCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'CLAIM_AIRDROP':
        response = await handleClaimAirdropCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'PENDING_AIRDROPS':
        response = await handlePendingAirdropsCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'GET_TOPIC_INFO':
        response = await handleGetTopicInfoCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'SUBMIT_TOPIC_MESSAGE':
        response = await handleSubmitTopicMessageCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'CREATE_TOPIC':
        response = await handleCreateTopicCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'GET_TOPIC_MESSAGES':
        response = await handleGetTopicMessagesCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'DELETE_TOPIC':
        response = await handleDeleteTopicCommand(parsedCommand, tweetEvent.user.screen_name);
        break;
        
      case 'HELP_COMMAND':
        // Provide help information with a link to the documentation
        response = `@${tweetEvent.user.screen_name} Here are some commands you can use:

💰 Account: register, check balance, transfer HBAR
🪙 Tokens: create token, show balances, mint tokens
📤 Transfer: send tokens, airdrop to multiple users
Full command reference: https://hederapaybot.netlify.app/help`;
        break;
        
      default:
        // If it's neither a special command nor a recognized command pattern, send to Eliza
        break;
    }
     
    if (response) {
      await replyToTweet(tweetEvent.id_str, response);
      console.log(`Processed ${parsedCommand.command} command for tweet ${tweetEvent.id_str}`);
      return;
    }
    
    // Handle greetings
    if (parsedCommand.command === 'GREETING') {
      await replyToTweet(
        tweetEvent.id_str,
        `Hello @${tweetEvent.user.screen_name}! I'm your Hedera Helper bot. How can I assist you today?`
      );
      console.log(`Processed greeting for tweet ${tweetEvent.id_str}`);
      return;
    }
    
    // Fall back to a generic message for unrecognized commands
    await replyToTweet(
      tweetEvent.id_str,
      `@${tweetEvent.user.screen_name} I didn't understand that command. Here are some examples:
Quick Command Guide 🚀

💰 check balance | send HBAR
🆕 register account
✨ create/mint tokens
🎯 airdrop tokens
For full command reference, visit: https://hederapaybot.netlify.app/help`
    );
  } catch (error) {
    console.error('Error processing tweet event:', error);
    
    // Attempt to send an error reply to the user
    try {
      await replyToTweet(
        tweetEvent.id_str,
        `@${tweetEvent.user.screen_name} Sorry, I encountered an error processing your request. Please try again later.`
      );
    } catch (replyError) {
      console.error('Error sending error reply:', replyError);
    }
    
    throw error;
  }
}

/**
 * Determine if a tweet should be processed
 * Checks if the tweet is from our bot (to avoid loops) and if it's a mention
 */
function shouldProcessTweet(tweetEvent: TweetEvent): boolean {
  const botUsername = process.env.TWITTER_BOT_USERNAME || 'HederaPayBot';
  
  // Skip processing if the tweet is from our own bot
  if (tweetEvent.user.screen_name.toLowerCase() === botUsername.toLowerCase()) {
    return false;
  }
  
  // Only process mentions of our bot
  if (!tweetEvent.text.toLowerCase().includes(`@${botUsername.toLowerCase()}`)) {
    return false;
  }
  
  return true;
}

/**
 * @api {get} /api/twitter/mentions Get recent mentions
 * @apiName GetRecentMentions
 * @apiGroup Twitter
 * @apiDescription Get recent mentions of the bot's Twitter account
 * 
 * @apiSuccess {Object[]} mentions Array of recent mentions
 */
export const getRecentMentions = async (req: Request, res: Response): Promise<Response> => {
  try {
    // For security, restrict this in production
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
      return res.status(403).json({ error: 'This endpoint is disabled in production' });
    }
    
    const mentions = await fetchRecentMentions();
    return res.status(200).json({ mentions });
  } catch (error) {
    console.error('Error fetching recent mentions:', error);
    return res.status(500).json({ error: 'Error fetching recent mentions' });
  }
};

/**
 * @api {post} /api/twitter/reply Send a test reply
 * @apiName SendTestReply
 * @apiGroup Twitter
 * @apiDescription Send a test reply to a tweet (for development)
 * 
 * @apiParam {String} tweet_id ID of the tweet to reply to
 * @apiParam {String} text Text of the reply
 * 
 * @apiSuccess {Object} result Result of the Twitter API call
 */
export const sendTestReply = async (req: Request, res: Response): Promise<Response> => {
  try {
    // For security, restrict this in production
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
      return res.status(403).json({ error: 'This endpoint is disabled in production' });
    }
    
    const { tweet_id, text } = req.body;
    
    if (!tweet_id || !text) {
      return res.status(400).json({ error: 'Missing tweet_id or text parameter' });
    }
    
    const result = await replyToTweet(tweet_id, text);
    return res.status(200).json({ result });
  } catch (error) {
    console.error('Error sending test reply:', error);
    return res.status(500).json({ error: 'Error sending test reply' });
  }
};

/**
 * @api {post} /api/twitter/force-reprocess Force reprocess tweets
 * @apiName ForceReprocessTweets
 * @apiGroup Twitter
 * @apiDescription Force reprocessing of specific tweets or all recent tweets
 * 
 * @apiParam {String[]} tweetIds Array of tweet IDs to reprocess (optional)
 * @apiParam {Boolean} all Set to true to reprocess all fetched tweets (optional)
 * 
 * @apiSuccess {Object} result Result of the operation
 */
export const forceReprocessTweets = async (req: Request, res: Response): Promise<Response> => {
  try {
    // For security, restrict this in production
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
      return res.status(403).json({ error: 'This endpoint is disabled in production' });
    }
    
    const { tweetIds, all } = req.body;
    
    if (!tweetIds && !all) {
      return res.status(400).json({ 
        error: 'Missing parameters. Provide either tweetIds array or all=true'
      });
    }
    
    // Process specific tweet IDs
    if (tweetIds && Array.isArray(tweetIds)) {
      const results = await Promise.all(
        tweetIds.map(async (id) => {
          const wasProcessed = await forceReprocessTweet(id);
          return { id, wasProcessed };
        })
      );
      
      return res.status(200).json({
        success: true,
        message: `Successfully removed ${results.filter(r => r.wasProcessed).length} tweets from processed list`,
        results
      });
    }
    
    // Process all recent tweets
    if (all) {
      const mentions = await fetchRecentMentions();
      const recentMentions = await filterRecentMentions(mentions);
      
      const results = await Promise.all(
        recentMentions.map(async (mention) => {
          const id = mention.id_str || mention.id || 'unknown';
          if (!id) return { id: 'unknown', wasProcessed: false };
          
          const wasProcessed = await forceReprocessTweet(id);
          return { id, wasProcessed };
        })
      );
      
      return res.status(200).json({
        success: true,
        message: `Successfully removed ${results.filter(r => r.wasProcessed).length} tweets from processed list`,
        results
      });
    }
    
    return res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error forcing tweet reprocessing:', error);
    return res.status(500).json({ error: 'Error forcing tweet reprocessing' });
  }
}; 