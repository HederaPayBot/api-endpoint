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
    
    // Initialize Hedera client and account
    const { Client, AccountId, PrivateKey } = require("@hashgraph/sdk");
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('No private key found in environment variables');
    }
    
    // Create client based on network type
    const client = networkType === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromStringED25519(privateKey)
    );
    
    try {
      // Query transaction history - since direct transaction history is complex,
      // use account info to get token relationships and balance information
      const { AccountInfoQuery } = require("@hashgraph/sdk");
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
      
      // Transform account info to transactions format
      const transactions = [];
      
      // Add HBAR balance as a pseudo-transaction
      transactions.push({
        id: null,
        hedera_transaction_id: `account-${accountId}-balance`,
        transaction_type: 'BALANCE',
        amount: accountInfo.balance.toString(),
        token_id: 'HBAR',
        timestamp: new Date().toISOString(),
        sender_username: 'System',
        recipient_username: twitterUsername,
        status: 'SUCCESS',
        memo: 'Current HBAR balance',
        network_type: networkType,
        source: 'hedera_sdk'
      });
      
      // Add token relationships as pseudo-transactions
      if (accountInfo.tokenRelationships && accountInfo.tokenRelationships._map) {
        const tokenMap = accountInfo.tokenRelationships._map as Map<string, any[]>;
        for (const [tokenId, relationship] of tokenMap.entries()) {
          if (relationship && relationship.length > 0) {
            const tokenRel = relationship[0];
            transactions.push({
              id: null,
              hedera_transaction_id: `token-${tokenId}-balance`,
              transaction_type: 'TOKEN_BALANCE',
              amount: tokenRel.balance ? tokenRel.balance.toString() : '0',
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
    
    // Initialize Hedera client
    const { Client, AccountId, PrivateKey } = require("@hashgraph/sdk");
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('No private key found in environment variables');
    }
    
    // Create client based on network type
    const client = networkType === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromStringED25519(privateKey)
    );
    
    try {
      // For token-balance style transactions
      if (transactionId.includes('token-') && transactionId.includes('-balance')) {
        const tokenId = transactionId.split('-')[1];
        
        // Get token balance
        const { AccountBalanceQuery } = require("@hashgraph/sdk");
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
 * Get all tokens from the network using Hedera SDK
 * 
 * @param username - Twitter username
 * @param networkType - 'mainnet' or 'testnet'
 * @param limit - Maximum number of tokens to return
 * @param startingToken - Token ID to start from (for pagination)
 * @returns Promise<Array> - List of tokens
 */
export async function getAllTokens(username: string, networkType: string = 'testnet', limit: number = 100, startingToken?: string): Promise<any[]> {
  try {
    // For backwards compatibility
    const network = networkType.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
    
    // Get user information to retrieve account details
    const user = sqliteDbService.userService.getUserByTwitterUsername(username);
    if (!user || !user.hedera_account_id) {
      throw new Error('User not found or has no Hedera account');
    }
    
    const accountId = user.hedera_account_id;
    
    // Initialize Hedera client
    const { Client, AccountId, PrivateKey, AccountInfoQuery } = require("@hashgraph/sdk");
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('No private key found in environment variables');
    }
    
    // Create client based on network type
    const client = network === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromStringED25519(privateKey)
    );
    
    try {
      // Get account info to retrieve token relationships
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
      
      const tokens = [];
      
      // Process token relationships
      if (accountInfo.tokenRelationships && accountInfo.tokenRelationships._map) {
        // Safely cast the map
        const tokenRelMap = accountInfo.tokenRelationships._map as Map<string, any[]>;
        
        // Sort by token ID if startingToken is provided
        const tokenEntries = Array.from(tokenRelMap.entries());
        
        if (startingToken) {
          const startingIndex = tokenEntries.findIndex(([id]) => id === startingToken);
          if (startingIndex >= 0) {
            tokenEntries.splice(0, startingIndex);
          }
        }
        
        // Take only up to the limit
        const limitedEntries = tokenEntries.slice(0, limit);
        
        for (const [tokenId, relationship] of limitedEntries) {
          if (relationship && relationship.length > 0) {
            const tokenRel = relationship[0];
            
            // Get token info directly via TokenInfoQuery if needed
            // For now, we'll use what's available in the relationship
            tokens.push({
              token_id: tokenId,
              name: tokenRel.tokenId ? tokenRel.tokenId.toString() : 'Unknown',
              symbol: 'UNKNOWN', // Not available in relationship
              type: 'FUNGIBLE_COMMON',
              supply: tokenRel.balance ? tokenRel.balance.toString() : '0',
              max_supply: '0', // Not available in relationship
              decimals: 0, // Not available in relationship
              treasury_account_id: null,
              network: network
            });
          }
        }
      }
      
      return tokens;
    } finally {
      if (client) {
        client.close();
      }
    }
  } catch (error) {
    console.error('Error retrieving all tokens:', error);
    return [];
  }
}

/**
 * Get specific token information by token ID using Hedera SDK
 * 
 * @param username - Twitter username
 * @param tokenId - Hedera token ID
 * @param networkType - 'mainnet' or 'testnet'
 * @returns Promise<Object> - Token information or null if not found
 */
export async function getTokenById(username: string, tokenId: string, networkType: string = 'testnet'): Promise<any | null> {
  try {
    // For backwards compatibility
    const network = networkType.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
    
    // Get user information to retrieve account details
    const user = sqliteDbService.userService.getUserByTwitterUsername(username);
    if (!user || !user.hedera_account_id) {
      throw new Error('User not found or has no Hedera account');
    }
    
    const accountId = user.hedera_account_id;
    
    // Initialize Hedera client
    const { Client, AccountId, PrivateKey, TokenInfoQuery, TokenId } = require("@hashgraph/sdk");
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('No private key found in environment variables');
    }
    
    // Create client based on network type
    const client = network === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    // Set operator
    client.setOperator(
      AccountId.fromString(accountId),
      PrivateKey.fromStringED25519(privateKey)
    );
    
    try {
      // Get token info
      const tokenInfo = await new TokenInfoQuery()
        .setTokenId(TokenId.fromString(tokenId))
        .execute(client);
      
      if (!tokenInfo) {
        return null;
      }
      
      return {
        token_id: tokenId,
        name: tokenInfo.name || 'Unknown',
        symbol: tokenInfo.symbol || 'UNKNOWN',
        type: tokenInfo.tokenType ? tokenInfo.tokenType.toString() : 'FUNGIBLE_COMMON',
        supply: tokenInfo.totalSupply ? tokenInfo.totalSupply.toString() : '0',
        max_supply: tokenInfo.maxSupply ? tokenInfo.maxSupply.toString() : '0',
        decimals: tokenInfo.decimals || 0,
        treasury_account_id: tokenInfo.treasuryAccountId ? tokenInfo.treasuryAccountId.toString() : null,
        custom_fees: tokenInfo.customFees || [],
        pause_key: !!tokenInfo.pauseKey,
        kyc_key: !!tokenInfo.kycKey,
        freeze_key: !!tokenInfo.freezeKey,
        supply_key: !!tokenInfo.supplyKey,
        admin_key: !!tokenInfo.adminKey,
        wipe_key: !!tokenInfo.wipeKey,
        created_timestamp: tokenInfo.createdTimestamp ? tokenInfo.createdTimestamp.toString() : null,
        expiry_timestamp: tokenInfo.expiryTimestamp ? tokenInfo.expiryTimestamp.toString() : null,
        auto_renew_period: tokenInfo.autoRenewPeriod ? tokenInfo.autoRenewPeriod.toString() : null,
        auto_renew_account_id: tokenInfo.autoRenewAccountId ? tokenInfo.autoRenewAccountId.toString() : null,
        network: network
      };
    } finally {
      if (client) {
        client.close();
      }
    }
  } catch (error) {
    console.error(`Error retrieving token info for ${tokenId}:`, error);
    return null;
  }
} 