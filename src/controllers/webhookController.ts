/**
 * Handle a Twitter mention
 * This function processes mentions directed at the bot and generates responses
 */
import { getHederaAccountFromTwitter } from '../services/elizaService';
import { 
  parseTwitterMention, 
  replyToTweet,
  hasBeenProcessed,
  markAsProcessed,
  getUserInfo,
  isBalanceQuery,
  generateBalanceResponse
} from '../services/twitterService';
import {
  handleSendCommand,
  handleBalanceCommand,
  handleHbarBalanceCommand,
  handleCreateTokenCommand,
  handleAirdropCommand
} from '../services/commandHandlers';

export async function handleMention(mention: any): Promise<void> {
  try {
    // Extract key information from the mention
    const mentionId = mention.id;
    const userId = mention.author_id;
    const mentionText = mention.text;
    
    console.log(`Processing mention ${mentionId} from user ${userId}: ${mentionText}`);
    
    // Skip processing if this mention has already been handled
    if (await hasBeenProcessed(mentionId)) {
      console.log(`Mention ${mentionId} has already been processed, skipping`);
      return;
    }
    
    // Save this mention as processed to avoid duplicate handling
    await markAsProcessed(mentionId);
    
    // Get user info from Twitter
    const userInfo = await getUserInfo(userId);
    if (!userInfo) {
      console.error(`Could not get user info for ${userId}`);
      return;
    }
    
    // Check if this is a valid mention with bot username
    const botUsername = process.env.TWITTER_BOT_USERNAME || 'HederaPayBot';
    if (!mentionText.toLowerCase().includes(`@${botUsername.toLowerCase()}`)) {
      console.log(`Skipping mention - Not mentioning @${botUsername}`);
      return;
    }
    
    // Parse the mention to determine the intended command
    const parsedCommand = parseTwitterMention(mentionText);
    console.log('Parsed command:', parsedCommand);
    
    // Check for balance queries first using our improved detection
    const balanceCheck = isBalanceQuery(mentionText);
    
    let responseText = '';
    
    // Handle balance queries first
    if (balanceCheck.isBalanceQuery && balanceCheck.type !== 'NONE') {
      console.log(`Detected balance query of type: ${balanceCheck.type}`);
      
      // Check if user is registered before handling balance
      const hederaAccountId = getHederaAccountFromTwitter(userInfo.username);
      if (!hederaAccountId) {
        responseText = `@${userInfo.username} You need to register your Hedera account first to check balances. Please use the "register [accountId]" command.`;
      } else {
        responseText = await generateBalanceResponse(userInfo.username, balanceCheck.type, balanceCheck.tokenId);
      }
    } else {
      // Process the command based on type
      switch (parsedCommand.command) {
        case 'SEND':
          responseText = await handleSendCommand(parsedCommand, userInfo.username);
          break;
        case 'BALANCE':
          responseText = await handleBalanceCommand(userInfo.username);
          break;
        case 'HBAR_BALANCE':
          responseText = await handleHbarBalanceCommand(userInfo.username);
          break;
        case 'REGISTER':
          responseText = `@${userInfo.username} To register your Hedera account, reply with "register [your-hedera-account-id]" (for example: register 0.0.12345).`;
          break;
        case 'CREATE_TOKEN':
          responseText = await handleCreateTokenCommand(parsedCommand, userInfo.username);
          break;
        case 'AIRDROP':
          responseText = await handleAirdropCommand(parsedCommand, userInfo.username);
          break;
        case 'GREETING':
          // For simple greetings, respond directly without calling Eliza
          responseText = `Hello @${userInfo.username}! I'm your Hedera Helper bot. How can I assist you today?`;
          break;
        default:
          // Default message for unsupported commands
          responseText = `@${userInfo.username} I didn't understand that command. Try "check my balance", "send tokens to @user", or "register [hedera-account-id]".`;
      }
    }
    
    // Reply to the mention with our response
    if (responseText) {
      await replyToTweet(mentionId, responseText);
      console.log(`Replied to mention ${mentionId}`);
    }
  } catch (error) {
    console.error('Error handling mention:', error);
  }
} 