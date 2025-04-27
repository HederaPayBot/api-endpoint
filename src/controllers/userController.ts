import { Request, Response } from 'express';
import { userService, hederaAccountService } from '../services/sqliteDbService';
import { encryptSensitiveData } from '../services/credentialService';
import { 
  getTransactionHistory, 
  getTransactionById, 
  getTokenById,
  getAllTokens,
} from '../services/hederaAccountService';

/**
 * Validate Hedera account ID format
 * @param accountId - The account ID to validate
 * @returns boolean indicating if format is valid
 */
const isValidHederaAccountId = (accountId: string): boolean => {
  // Format should be 0.0.12345
  return /^\d+\.\d+\.\d+$/.test(accountId);
};

/**
 * Validate Hedera private key format
 * @param privateKey - The private key to validate
 * @returns boolean indicating if format is valid
 */
const isValidPrivateKey = (privateKey: string): boolean => {
  // Basic validation for ED25519 private key (hex string starting with 302e...)
  return /^302e[0-9a-fA-F]{68,}$/.test(privateKey);
};

/**
 * Validate Hedera public key format
 * @param publicKey - The public key to validate
 * @returns boolean indicating if format is valid
 */
const isValidPublicKey = (publicKey: string): boolean => {
  // Basic validation for ED25519 public key (hex string, optionally with 0x prefix)
  const keyWithoutPrefix = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  return /^[0-9a-fA-F]{64}$/.test(keyWithoutPrefix);
};

/**
 * Encrypt sensitive data for storage
 * @param data - The data to encrypt
 * @returns Encrypted data
 */


/**
 * @api {post} /api/users/register Register a new user
 * @apiName RegisterUser
 * @apiGroup User
 * @apiDescription Register a user with their Twitter details and Hedera account
 * 
 * @apiParam {String} twitterUsername User's Twitter username (without @)
 * @apiParam {String} twitterId User's Twitter ID
 * @apiParam {String} hederaAccountId User's Hedera account ID (e.g., 0.0.12345)
 * @apiParam {String} hederaPrivateKey User's Hedera private key
 * @apiParam {String} hederaPublicKey User's Hedera public key
 * @apiParam {String} [hederaNetworkType="testnet"] Hedera network type (testnet, mainnet, etc.)
 * @apiParam {String} [hederaKeyType="ED25519"] Hedera key type
 * 
 * @apiSuccess {Boolean} success Indicates if registration was successful
 * @apiSuccess {String} message Success message
 * @apiError {String} error Error message
 */
export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      twitterUsername, 
      twitterId, 
      hederaAccountId, 
      hederaPrivateKey,
      hederaPublicKey,
      hederaNetworkType = 'testnet',
      hederaKeyType = 'ED25519'
    } = req.body;
    
    // Validate required fields
    if (!twitterUsername || !hederaAccountId || !hederaPrivateKey || !hederaPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'Twitter username, Hedera account ID, private key, and public key are required'
      });
    }
    
    // Validate Hedera account ID format
    if (!isValidHederaAccountId(hederaAccountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Hedera account ID format. Should be in format 0.0.12345'
      });
    }
    
    // Validate Hedera private key format
    if (!isValidPrivateKey(hederaPrivateKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Hedera private key format'
      });
    }
    
    // Validate Hedera public key format
    if (!isValidPublicKey(hederaPublicKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Hedera public key format'
      });
    }
    
    // Encrypt sensitive data for storage
    const encryptedPrivateKey = encryptSensitiveData(hederaPrivateKey);
    const publicKeyForStorage = hederaPublicKey.startsWith('0x') ? hederaPublicKey : `0x${hederaPublicKey}`;
    
    // Check if user already exists
    const existingUser = userService.getUserByTwitterUsername(twitterUsername);
    
    if (existingUser) {
      // If user exists but doesn't have a Hedera account, link it
      if (!existingUser.hedera_account_id) {
        hederaAccountService.linkHederaAccount(
          existingUser.id, 
          hederaAccountId, 
          true, // isPrimary
          encryptedPrivateKey,
          publicKeyForStorage,
          hederaNetworkType,
          hederaKeyType
        );
        
        return res.status(200).json({
          success: true,
          message: `Hedera account ${hederaAccountId} linked to existing user @${twitterUsername}`
        });
      }
      
      // If user already has a linked account, notify
      return res.status(400).json({
        success: false,
        error: `User @${twitterUsername} already has a linked Hedera account: ${existingUser.hedera_account_id}`
      });
    }
    
    // Create new user
    const twitterUniqueId = twitterId || `${twitterUsername}_${new Date().toISOString().replace(/[-:.]/g, '')}`;
    const newUser = userService.createUser(
      twitterUsername,
      twitterUniqueId
    );
    
    // Link Hedera account with additional credentials
    hederaAccountService.linkHederaAccount(
      newUser.id, 
      hederaAccountId, 
      true, // isPrimary
      encryptedPrivateKey,
      publicKeyForStorage,
      hederaNetworkType,
      hederaKeyType
    );
    
    return res.status(201).json({
      success: true,
      message: `Successfully registered @${twitterUsername} with Hedera account ${hederaAccountId}`
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
};

/**
 * @api {get} /api/users/profile/:username Get user profile
 * @apiName GetUserProfile
 * @apiGroup User
 * @apiDescription Get a user's profile information
 * 
 * @apiParam {String} username User's Twitter username
 * 
 * @apiSuccess {Object} user User profile information
 * @apiError {String} error Error message
 */
export const getUserProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username parameter is required'
      });
    }
    
    // Get user from database
    const user = userService.getUserByTwitterUsername(username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User @${username} not found`
      });
    }
    
    // Get all Hedera accounts for this user
    const hederaAccounts = hederaAccountService.getAccountsForUser(user.id);
    
    // Format response
    return res.status(200).json({
      success: true,
      user: {
        twitterUsername: user.twitter_username,
        twitterId: user.twitter_id,
        registeredAt: user.created_at,
        hederaAccounts: hederaAccounts.map(account => ({
          accountId: account.account_id,
          isPrimary: account.is_primary,
          linkedAt: account.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching profile'
    });
  }
};

/**
 * @api {put} /api/users/profile Update user profile
 * @apiName UpdateUserProfile
 * @apiGroup User
 * @apiDescription Update a user's profile information, including Hedera accounts
 * 
 * @apiParam {String} twitterUsername User's Twitter username
 * @apiParam {String} [hederaAccountId] New Hedera account ID to link
 * @apiParam {Boolean} [makeDefault] Whether to make the new account the default
 * 
 * @apiSuccess {Boolean} success Indicates if update was successful
 * @apiSuccess {String} message Success message
 * @apiError {String} error Error message
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { twitterUsername, hederaAccountId, makeDefault } = req.body;
    
    if (!twitterUsername) {
      return res.status(400).json({
        success: false,
        error: 'Twitter username is required'
      });
    }
    
    // Get user from database
    const user = userService.getUserByTwitterUsername(twitterUsername);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User @${twitterUsername} not found`
      });
    }
    
    // If adding or updating Hedera account
    if (hederaAccountId) {
      // Validate Hedera account ID
      if (!isValidHederaAccountId(hederaAccountId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Hedera account ID format. Should be in format 0.0.12345'
        });
      }
      
      // Link the new account
      const isPrimary = makeDefault === true;
      hederaAccountService.linkHederaAccount(user.id, hederaAccountId, isPrimary);
      
      return res.status(200).json({
        success: true,
        message: `Hedera account ${hederaAccountId} linked to @${twitterUsername}${isPrimary ? ' as primary account' : ''}`
      });
    }
    
    // If we get here with no updates, return a message
    return res.status(200).json({
      success: true,
      message: 'No changes were made to the profile'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while updating profile'
    });
  }
};

/**
 * @api {post} /api/users/link-hedera-account Link a user to a Hedera account
 * @apiName LinkUserToHederaAccount
 * @apiGroup User
 * @apiDescription Link a user to a Hedera account
 * 
 * @apiParam {String} username User's Twitter username
 * @apiParam {String} hederaAccountId Hedera account ID to link
 * @apiParam {String} privateKey User's Hedera private key
 * @apiParam {String} publicKey User's Hedera public key
 * @apiParam {String} networkType Hedera network type
 * @apiParam {String} keyType Hedera key type
 * 
 * @apiSuccess {Boolean} success Indicates if linking was successful
 * @apiSuccess {String} message Success message
 * @apiError {String} error Error message
 */
export const linkUserToHederaAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, hederaAccountId,privateKey,publicKey,networkType,keyType } = req.body;
    if(!username || !hederaAccountId || !privateKey || !publicKey || !networkType || !keyType){
      return res.status(400).json({
        success: false,
        error: 'Username, Hedera account ID, private key, public key, network type, and key type are required'
      });
    }

    const user = userService.getUserByTwitterUsername(username);
    if(!user){
      return res.status(404).json({
        success: false,
        error: `User @${username} not found`
      });
    }


    hederaAccountService.linkHederaAccount(user.id, hederaAccountId, false,privateKey,publicKey,networkType,keyType);

    return res.status(200).json({
      success: true,
      message: `Hedera account ${hederaAccountId} linked to @${username}`
    });
  } catch (error) {
    console.error('Error linking user to Hedera account:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while linking user to Hedera account ' + error.message
    });
  }
  
}
/**
 * @api {get} /api/users/link-status/:username Check account linking status
 * @apiName GetLinkStatus
 * @apiGroup User
 * @apiDescription Check if a Twitter user has linked their Hedera account
 * 
 * @apiParam {String} username User's Twitter username
 * 
 * @apiSuccess {Boolean} linked Whether the user has linked a Hedera account
 * @apiSuccess {String} [hederaAccount] The linked Hedera account ID if available
 * @apiError {String} error Error message
 */
export const getLinkStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username parameter is required'
      });
    }
    
    // Get user from database
    const user = userService.getUserByTwitterUsername(username);
    
    if (!user) {
      return res.status(200).json({
        success: true,
        linked: false
      });
    }
    
    // Check if user has a Hedera account
    const hederaAccount = hederaAccountService.getPrimaryAccountForUser(user.id);
    
    return res.status(200).json({
      success: true,
      linked: !!hederaAccount,
      hederaAccount: hederaAccount ? hederaAccount.account_id : undefined
    });
  } catch (error) {
    console.error('Error checking link status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while checking link status'
    });
  }
};

/**
 * @api {get} /api/users/transactions/:username Get user transaction history
 * @apiName GetUserTransactionHistory
 * @apiGroup User
 * @apiDescription Get a user's transaction history from both local database and Hedera network via Eliza
 * 
 * @apiParam {String} username User's Twitter username
 * 
 * @apiSuccess {Object[]} transactions List of transactions
 * @apiError {String} error Error message
 */
export const getUserTransactionHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username parameter is required'
      });
    }
    
    // Get user from database
    const user = userService.getUserByTwitterUsername(username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User @${username} not found`
      });
    }

    // Get user's Hedera account ID
    const accountId = user.hedera_account_id;
    if (!accountId) {
      return res.status(404).json({
        success: false,
        error: `User @${username} does not have a linked Hedera account`
      });
    }

    // Get transactions using Eliza integration
    const transactions = await getTransactionHistory(user.id);
    console.log("transactions",transactions)
    return res.status(200).json({
      success: true,
      transactions: transactions.map(tx => ({
        id: tx.id,
        transactionId: tx.hedera_transaction_id,
        type: tx.transaction_type,
        amount: tx.amount,
        tokenId: tx.token_id,
        timestamp: tx.timestamp,
        senderUsername: tx.sender_username,
        recipientUsername: tx.recipient_username,
        status: tx.status,
        source: tx.source || 'local_db',
        memo: tx.memo
      }))
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving transaction history'
    });
  }
};

/**
 * @api {get} /api/users/transaction/:transactionId Get transaction details
 * @apiName GetTransactionDetails
 * @apiGroup User
 * @apiDescription Get details of a specific transaction from local database or Hedera network via Eliza
 * 
 * @apiParam {String} transactionId Hedera transaction ID
 * 
 * @apiSuccess {Object} transaction Transaction details
 * @apiError {String} error Error message
 */
export const getTransactionDetails = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { transactionId,username } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID parameter is required'
      });
    }

    if(!username){
      return res.status(400).json({
        success: false,
        error: 'Username parameter is required'
      });
    }
    // Get transaction from database or Eliza
    const transaction = await getTransactionById(transactionId,username);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID ${transactionId} not found`
      });
    }
    
    // Format response with hashscan URL
    const networkType = transaction.network_type || 'testnet';
    const hashscanUrl = `https://hashscan.io/${networkType === 'mainnet' ? 'mainnet' : 'testnet'}/tx/${transaction.hedera_transaction_id}`;
    
    return res.status(200).json({
      success: true,
      transaction: {
        id: transaction.id,
        transactionId: transaction.hedera_transaction_id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        tokenId: transaction.token_id,
        timestamp: transaction.timestamp,
        senderUsername: transaction.sender_username,
        recipientUsername: transaction.recipient_username,
        status: transaction.status,
        memo: transaction.memo,
        networkType: transaction.network_type,
        source: transaction.source || 'local_db',
        hashscanUrl
      }
    });
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving transaction details'
    });
  }
};


/**
 * @api {get} /api/user/all-tokens Get all tokens
 * @apiName GetAllTokens
 * @apiGroup Tokens
 * @apiDescription Get a list of all tokens
 * 
 * @apiQuery {String} [network=testnet] Network to fetch tokens from (testnet or mainnet)
 * @apiQuery {Number} [limit=100] Number of tokens to return (max 1000)
 * @apiQuery {String} [startingToken] Token ID to start from for pagination
 * 
 * @apiSuccess {Object[]} tokens List of tokens
 * @apiSuccess {String} tokens.tokenId Token ID
 * @apiSuccess {String} tokens.name Token name
 * @apiSuccess {String} tokens.symbol Token symbol
 * @apiSuccess {Number} tokens.decimals Token decimals
 * @apiSuccess {String} tokens.totalSupply Total supply of the token
 */
export const getAllUserTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const network = req.query.network as string || 'testnet';
    const limit = parseInt(req.query.limit as string) || 100;
    const startingToken = req.query.startingToken as string;

    if(!username){
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Validate network parameter
    if (network !== 'testnet' && network !== 'mainnet') {
      res.status(400).json({ error: 'Invalid network parameter. Must be "testnet" or "mainnet"' });
      return;
    }

    // Validate limit parameter
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      res.status(400).json({ error: 'Invalid limit parameter. Must be a number between 1 and 1000' });
      return;
    }

    const tokens = await getAllTokens(username,network,limit,startingToken);

    res.status(200).json(tokens);
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
};

/**
 * @api {get} /api/user/token/:tokenId Get token by ID
 * @apiName GetTokenById
 * @apiGroup Tokens
 * @apiDescription Get detailed information about a specific token by its ID
 * 
 * @apiParam {String} tokenId Token ID to fetch
 * @apiQuery {String} [network=testnet] Network to fetch token from (testnet or mainnet)
 * 
 * @apiSuccess {String} tokenId Token ID
 * @apiSuccess {String} name Token name
 * @apiSuccess {String} symbol Token symbol
 * @apiSuccess {Number} decimals Token decimals
 * @apiSuccess {String} totalSupply Total supply of the token
 * @apiSuccess {Object} treasury Treasury account information
 * @apiSuccess {String[]} [customFees] Custom fees associated with the token
 */
export const getUserTokenById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId, username } = req.params;
    const network = req.query.network as string || 'testnet';

    // Validate tokenId parameter
    if (!tokenId) {
      res.status(400).json({ error: 'Token ID is required' });
      return;
    }

    if(!username){
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Validate network parameter
    if (network !== 'testnet' && network !== 'mainnet') {
      res.status(400).json({ error: 'Invalid network parameter. Must be "testnet" or "mainnet"' });
      return;
    }

    
    const token = await getTokenById(username,tokenId, network);

    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    res.status(200).json(token);
  } catch (error) {
    console.error(`Error fetching token ${req.params.tokenId}:`, error);
    res.status(500).json({ error: 'Failed to fetch token details' });
  }
};

