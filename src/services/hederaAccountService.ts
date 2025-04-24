import { 
  AccountId,
  PrivateKey,
  Client,
  AccountCreateTransaction,
  Hbar,
  Status
} from "@hashgraph/sdk";
import { userService, hederaAccountService } from './sqliteDbService';
import { config } from 'dotenv';

// Load environment variables
config();

// Get the operator account ID and private key from environment variables
const operatorId = process.env.HEDERA_OPERATOR_ID || '0.0.5864628'; // Fallback for testing
const operatorKey = process.env.HEDERA_OPERATOR_KEY || '424cc90352e7bfcf70276885ab453d62f70a65dfb03232065a49ba6122716904'; // Fallback for testing
const networkType = process.env.HEDERA_NETWORK || 'testnet';

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
    let user = userService.getUserByTwitterUsername(twitterUsername);
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
      user = userService.createUser(twitterUsername, twitterId || `twitter_${Date.now()}`);
    }
    
    // Link the Hedera account to the user
    const userId = typeof user.id === 'bigint' ? Number(user.id) : user.id;
    hederaAccountService.linkHederaAccount(
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