import { Request, Response } from 'express';
import { userService, hederaAccountService } from '../services/sqliteDbService';
import { encryptSensitiveData } from '../services/credentialService';

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

