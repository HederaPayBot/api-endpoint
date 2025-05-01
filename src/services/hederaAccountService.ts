import { 
  AccountId,
  PrivateKey,
  Client,
  AccountCreateTransaction,
  Hbar,
  Status,
} from "@hashgraph/sdk";
import * as sqliteDbService from './sqliteDbService';
import { config } from 'dotenv';
import { sendCommandToEliza, formatElizaResponseForTwitter } from './elizaService';

// Load environment variables
config();

// Get the operator account ID and private key from environment variables
const operatorId = process.env.HEDERA_ACCOUNT_ID || '0.0.5864628'; // Fallback for testing
const operatorKey = process.env.HEDERA_PRIVATE_KEY || '302e020100300506032b657004220420424cc90352e7bfcf70276885ab453d62f70a65dfb03232065a49ba6122716904'; // Fallback for testing
const networkType = process.env.HEDERA_NETWORK_TYPE || 'testnet';

// Create the client for the appropriate network
let client: Client;

/**
 * Initialize the Hedera client
 */
function initHederaClient(): Client {
  if (client) return client;
  
  try {
    if (networkType.toLowerCase() === 'mainnet') {
      client = Client.forMainnet();
    } else {
      client = Client.forTestnet();
    }
    
    // Set the operator account
    const operatorAccount = AccountId.fromString(operatorId);
    const operatorPrivateKey = PrivateKey.fromStringED25519(operatorKey);
    
    client.setOperator(operatorAccount, operatorPrivateKey);
    console.log('Hedera client initialized for', networkType);
    return client;
  } catch (error) {
    console.error('Error initializing Hedera client:', error);
    throw error;
  }
}

/**
 * Create a new Hedera account
 * 
 * @param initialBalance - Initial HBAR balance to fund (default: 10)
 * @returns Object containing account information
 */
export async function createHederaAccount(initialBalance: number = 10): Promise<{
  accountId: string;
  privateKey: string;
  publicKey: string;
  evmAddress: string;
  transactionId: string;
  status: string;
}> {
  try {
    // Initialize the client if not already initialized
    const client = initHederaClient();
    
    // Generate a new key pair
    const privateKey = PrivateKey.generateECDSA();
    const publicKey = privateKey.publicKey;
    
    // Create a new account with the public key
    const transaction = new AccountCreateTransaction()
      .setKey(publicKey)
      .setInitialBalance(new Hbar(initialBalance))
      .setAlias(publicKey.toEvmAddress());
      
    // Execute the transaction
    const response = await transaction.execute(client);
    
    // Get the receipt to check status and get the new account ID
    const receipt = await response.getReceipt(client);
    
    // Get the transaction ID and status
    const transactionId = response.transactionId.toString();
    const status = receipt.status.toString();
    
    // Return account information if successful
    if (receipt.status === Status.Success) {
      const accountId = receipt.accountId!.toString();
      
      return {
        accountId,
        privateKey: privateKey.toString(),
        publicKey: publicKey.toString(),
        evmAddress: publicKey.toEvmAddress(),
        transactionId,
        status
      };
    } else {
      throw new Error(`Account creation failed with status: ${status}`);
    }
  } catch (error) {
    console.error('Error creating Hedera account:', error);
    throw error;
  }
}

/**
 * Create a Hedera account for a Twitter user
 * 
 * @param twitterUsername - Twitter username
 * @param twitterId - Twitter user ID
 * @param initialBalance - Initial HBAR balance (default: 10)
 * @returns Object with success status and account info
 */
export async function createAccountForTwitterUser(
  twitterUsername: string,
  twitterId: string,
  initialBalance: number = 10
): Promise<{
  success: boolean;
  message: string;
  accountId?: string;
  transactionId?: string;
}> {
  try {
    // Check if user already exists and has an account
    let user = sqliteDbService.userService.getUserByTwitterUsername(twitterUsername);
    if (user && user.hedera_account_id) {
      return {
        success: false,
        message: `User @${twitterUsername} already has a Hedera account: ${user.hedera_account_id}`
      };
    }
    
    // Create a new Hedera account
    const accountInfo = await createHederaAccount(initialBalance);
    
    // If user doesn't exist, create it
    if (!user) {
      user = sqliteDbService.userService.createUser(twitterUsername, twitterId || `twitter_${Date.now()}`);
    }
    
    // Link the Hedera account to the user
    const userId = typeof user.id === 'bigint' ? Number(user.id) : user.id;
    sqliteDbService.hederaAccountService.linkHederaAccount(
      userId,
      accountInfo.accountId,
      true, // Make this the primary account
      accountInfo.privateKey,
      accountInfo.publicKey,
      networkType,
      'ECDSA'
    );
    
    console.log(`Created Hedera account ${accountInfo.accountId} for Twitter user @${twitterUsername}`);
    
    const txIdAccountCreated = accountInfo.transactionId;
    const hashscanUrl = `https://hashscan.io/testnet/tx/${txIdAccountCreated}`;
    
    return {
      success: true,
      message: `Hedera account ${accountInfo.accountId} created for @${twitterUsername}. Check details: ${hashscanUrl}`,
      accountId: accountInfo.accountId,
      transactionId: accountInfo.transactionId
    };
  } catch (error) {
    console.error(`Error creating Hedera account for Twitter user @${twitterUsername}:`, error);
    return {
      success: false,
      message: `Error creating Hedera account: ${error.message}`
    };
  }
}

/**
 * Get transaction history for a user using Hedera SDK directly
 * 
 * @param userId - User ID
 * @returns Array of transactions
 */
export async function getTransactionHistory(userId: number) {
  try {
    // Get user information
    const user = sqliteDbService.userService.getUserById(userId);
    if (!user || !user.twitter_username || !user.hedera_account_id) {
      throw new Error('User not found or has no Hedera account');
    }
    
    const twitterUsername = user.twitter_username;
    const accountId = user.hedera_account_id;
    
    // Initialize Hedera client with operator account (not the user's account)
    const { Client, AccountId, PrivateKey, AccountInfoQuery, AccountBalanceQuery } = require("@hashgraph/sdk");
    
    // Create client based on network type and use the operator account
    const client = networkType === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator using the operator credentials (not the user's account)
    const operatorAccount = AccountId.fromString(operatorId);
    const operatorPrivateKey = PrivateKey.fromStringED25519(operatorKey);
    client.setOperator(operatorAccount, operatorPrivateKey);
    
    try {
      // Query balance first (simpler and more reliable)
      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(accountId);
      
      const balance = await balanceQuery.execute(client);
      
      // Transform balance info to transactions format
      const transactions = [];
      
      // Add HBAR balance as a pseudo-transaction
      transactions.push({
        id: null,
        hedera_transaction_id: `account-${accountId}-balance`,
        transaction_type: 'BALANCE',
        amount: balance.hbars.toString(),
        token_id: 'HBAR',
        timestamp: new Date().toISOString(),
        sender_username: 'System',
        recipient_username: twitterUsername,
        status: 'SUCCESS',
        memo: 'Current HBAR balance',
        network_type: networkType,
        source: 'hedera_sdk'
      });
      
      // Add token balances as pseudo-transactions
      if (balance.tokens && balance.tokens.size > 0) {
        for (const [tokenId, amount] of balance.tokens.entries()) {
          transactions.push({
            id: null,
            hedera_transaction_id: `token-${tokenId}-balance`,
            transaction_type: 'TOKEN_BALANCE',
            amount: amount.toString(),
            token_id: tokenId,
            timestamp: new Date().toISOString(),
            sender_username: 'System',
            recipient_username: twitterUsername,
            status: 'SUCCESS',
            memo: `Current ${tokenId} token balance`,
            network_type: networkType,
            source: 'hedera_sdk'
          });
        }
      }
      
      return transactions;
    } finally {
      if (client) {
        client.close();
      }
    }
  } catch (error) {
    console.error('Error retrieving transaction history:', error);
    return [];
  }
}

/**
 * Get transaction details by transaction ID using Hedera SDK
 * 
 * @param transactionId - Hedera transaction ID
 * @param userName - Twitter username
 * @returns Transaction details
 */
export async function getTransactionById(transactionId: string, userName?: string) {
  try {
    if (!userName) {
      throw new Error(`No user name provided for transaction ID ${transactionId}`);
    }
    
    // Get user information to retrieve account details
    const user = sqliteDbService.userService.getUserByTwitterUsername(userName);
    if (!user || !user.hedera_account_id) {
      throw new Error('User not found or has no Hedera account');
    }
    
    const accountId = user.hedera_account_id;
    
    // Initialize Hedera client using the operator account
    const { Client, AccountId, PrivateKey, AccountBalanceQuery } = require("@hashgraph/sdk");
    
    // Create client based on network type
    const client = networkType === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator using the operator credentials
    const operatorAccount = AccountId.fromString(operatorId);
    const operatorPrivateKey = PrivateKey.fromStringED25519(operatorKey);
    client.setOperator(operatorAccount, operatorPrivateKey);
    
    try {
      // For token-balance style transactions
      if (transactionId.includes('token-') && transactionId.includes('-balance')) {
        const tokenId = transactionId.split('-')[1];
        
        // Get token balance
        const balance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(client);
          
        if (tokenId === 'HBAR') {
          return {
            id: null,
            hedera_transaction_id: transactionId,
            transaction_type: 'BALANCE',
            amount: balance.hbars.toString(),
            token_id: 'HBAR',
            timestamp: new Date().toISOString(),
            sender_username: 'System',
            recipient_username: userName,
            status: 'SUCCESS',
            memo: 'Current HBAR balance',
            network_type: networkType,
            source: 'hedera_sdk'
          };
        } else if (balance.tokens && balance.tokens.get(tokenId)) {
          return {
            id: null,
            hedera_transaction_id: transactionId,
            transaction_type: 'TOKEN_BALANCE',
            amount: balance.tokens.get(tokenId).toString(),
            token_id: tokenId,
            timestamp: new Date().toISOString(),
            sender_username: 'System',
            recipient_username: userName,
            status: 'SUCCESS',
            memo: `Current ${tokenId} token balance`,
            network_type: networkType,
            source: 'hedera_sdk'
          };
        }
      } else {
        // Since actual transaction query by ID is limited by 24 hour window in Hedera
        // we'll return a placeholder message for real transaction IDs
        // In a production environment, this would require mirror node API or TransactionRecordQuery
        return {
          id: null,
          hedera_transaction_id: transactionId,
          transaction_type: 'TRANSFER',
          amount: '0',
          token_id: 'HBAR',
          timestamp: new Date().toISOString(),
          sender_username: 'Unknown',
          recipient_username: userName,
          status: 'SUCCESS',
          memo: 'Transaction details require mirror node API access',
          network_type: networkType,
          source: 'hedera_sdk'
        };
      }
      
      // Transaction not found
      return null;
    } finally {
      if (client) {
        client.close();
      }
    }
  } catch (error) {
    console.error('Error retrieving transaction details:', error);
    return null;
  }
}

/**
 * Get all tokens for a user
 * @param username Twitter username
 * @param network Network type (testnet or mainnet)
 * @param limit Maximum number of tokens to return
 * @param startingToken Token ID to start pagination
 * @returns Array of token information
 */
export async function getAllTokens(
  username: string, 
  network: string = 'testnet', 
  limit: number = 100,
  startingToken?: string
): Promise<any> {
  try {
    // Generate a unique user ID for this request
    const userId = `user_${Date.now()}`;
    
    // Query Eliza for token balances - use the same consistent command format
    const response = await sendCommandToEliza('get token balances', userId, username);
    
    // Check if we have a valid response with token balances
    const balanceResponse = response.find(item => item.content && item.content.amount);
    
    if (!balanceResponse || !balanceResponse.content || !balanceResponse.content.amount) {
      return { 
        success: false, 
        error: 'Failed to retrieve token balances',
        tokens: []
      };
    }
    
    // Extract tokens from the response
    const tokens = balanceResponse.content.amount.map(token => ({
      tokenId: token.tokenId,
      name: token.tokenName,
      symbol: token.tokenSymbol,
      decimals: parseInt(token.tokenDecimals),
      balance: token.balanceInDisplayUnit,
      rawBalance: token.balance
    }));
    
    // Apply pagination if needed
    let filteredTokens = tokens;
    if (startingToken) {
      const startIndex = tokens.findIndex(t => t.tokenId === startingToken);
      if (startIndex !== -1) {
        filteredTokens = tokens.slice(startIndex + 1);
      }
    }
    
    // Apply limit
    filteredTokens = filteredTokens.slice(0, limit);
    
    return {
      success: true,
      tokens: filteredTokens,
      totalTokens: tokens.length,
      accountId: balanceResponse.content.address,
      network
    };
  } catch (error) {
    console.error('Error getting all tokens:', error);
    return { 
      success: false, 
      error: 'Failed to retrieve token balances',
      tokens: []
    };
  }
}

/**
 * Get token details by ID
 * @param username Twitter username
 * @param tokenId Token ID
 * @param network Network type (testnet or mainnet)
 * @returns Token details
 */
export async function getTokenById(
  username: string,
  tokenId: string,
  network: string = 'testnet'
): Promise<any> {
  try {
    // Generate a unique user ID for this request
    const userId = `user_${Date.now()}`;
    
    // Query Eliza for token balances - use the same consistent command format
    const response = await sendCommandToEliza("get token balances", userId, username);
    
    // Check if we have a valid response with token balances
    const balanceResponse = response.find(item => item.content && item.content.amount);
    
    if (!balanceResponse || !balanceResponse.content || !balanceResponse.content.amount) {
      return { 
        success: false, 
        error: 'Failed to retrieve token information'
      };
    }
    
    // Find the specific token
    const tokenInfo = balanceResponse.content.amount.find(token => token.tokenId === tokenId);
    
    if (!tokenInfo) {
      return {
        success: false,
        error: `Token with ID ${tokenId} not found in user's balance`
      };
    }
    
    return {
      success: true,
      token: {
        tokenId: tokenInfo.tokenId,
        name: tokenInfo.tokenName,
        symbol: tokenInfo.tokenSymbol,
        decimals: parseInt(tokenInfo.tokenDecimals),
        balance: tokenInfo.balanceInDisplayUnit,
        rawBalance: tokenInfo.balance,
        accountId: balanceResponse.content.address,
        network
      }
    };
  } catch (error) {
    console.error(`Error getting token by ID (${tokenId}):`, error);
    return { 
      success: false, 
      error: 'Failed to retrieve token information'
    };
  }
}

/**
 * Get user's HBAR balance
 * @param username Twitter username
 * @param network Network type (testnet or mainnet)
 * @returns HBAR balance information
 */
export async function getHbarBalance(
  username: string,
  network: string = 'testnet'
): Promise<any> {
  try {
    // Generate a unique user ID for this request
    const userId = `user_${Date.now()}`;
    
    // Query Eliza for HBAR balance
    const response = await sendCommandToEliza('What is my HBAR balance', userId, username);
    
    // Get the first response item (which should contain the balance info)
    const balanceResponse = response.find(item => 
      item.text && item.text.includes('HBAR balance')
    );
    
    if (!balanceResponse || !balanceResponse.text) {
      return { 
        success: false, 
        error: 'Failed to retrieve HBAR balance'
      };
    }
    
    // Extract the balance from the text response
    // Format example: "Your HBAR balance is 785.20993911 HBAR."
    const balanceMatch = balanceResponse.text.match(/([0-9.]+)\s+HBAR/);
    if (!balanceMatch || !balanceMatch[1]) {
      return {
        success: false,
        error: 'Failed to parse HBAR balance from response'
      };
    }
    
    // Get user to retrieve account ID
    const user = sqliteDbService.userService.getUserByTwitterUsername(username);
    if (!user || !user.hedera_account_id) {
      return {
        success: false,
        error: 'User not found or has no Hedera account'
      };
    }
    
    return {
      success: true,
      accountId: user.hedera_account_id,
      hbarBalance: balanceMatch[1],
      network
    };
  } catch (error) {
    console.error('Error getting HBAR balance:', error);
    return { 
      success: false, 
      error: 'Failed to retrieve HBAR balance'
    };
  }
} 