import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';


// Define interfaces for our database tables
interface User {
  id: number;
  twitter_username: string;
  twitter_id: string;
  hedera_account_id?: string;
  created_at: string;
  updated_at: string;
}

interface HederaAccount {
  id: number;
  user_id: number;
  account_id: string;
  is_primary: number;
  private_key?: string;
  public_key?: string;
  network_type?: string;
  key_type?: string;
  created_at: string;
}

// Make sure db directory exists
const dbDir = path.resolve(__dirname, '../../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(path.resolve(dbDir, 'hedPay.sqlite'));

// Create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitter_username TEXT UNIQUE,
  twitter_id TEXT,
  hedera_account_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS hedera_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  account_id TEXT,
  is_primary INTEGER DEFAULT 0,
  private_key TEXT,
  public_key TEXT,
  network_type TEXT DEFAULT 'testnet',
  key_type TEXT DEFAULT 'ED25519',
  created_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

/**
 * User Service
 * Handles user registration and lookups
 */
export const userService = {
  /**
   * Create a new user
   * @param twitterUsername - Twitter username (without @)
   * @param twitterId - Twitter user ID
   * @returns The created user
   */
  createUser: (twitterUsername: string, twitterId: string): User => {
    try {
      const now = new Date().toISOString();
      
      // Prepare the insert statement
      const stmt = db.prepare(
        `INSERT INTO users (twitter_username, twitter_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?)`
      );
      
      // Execute the statement and get the result
      const info = stmt.run(twitterUsername.toLowerCase(), twitterId, now, now);
      
      console.log(`Created user: ${twitterUsername} with ID: ${info.lastInsertRowid}`);
      
      // Return the created user
      return {
        id: Number(info.lastInsertRowid),
        twitter_username: twitterUsername,
        twitter_id: twitterId,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },

  /**
   * Get user by Twitter username
   * @param twitterUsername - Twitter username (without @)
   * @returns User object or undefined if not found
   */
  getUserByTwitterUsername: (twitterUsername: string): User | undefined => {
    try {
      const stmt = db.prepare(
        `SELECT * FROM users WHERE LOWER(twitter_username) = ?`
      );
      return stmt.get(twitterUsername.toLowerCase()) as User | undefined;
    } catch (error) {
      console.error(`Error getting user by twitter username (${twitterUsername}):`, error);
      return undefined;
    }
  },

  /**
   * Get user by Twitter ID
   * @param twitterId - Twitter user ID
   * @returns User object or undefined if not found
   */
  getUserByTwitterId: (twitterId: string): User | undefined => {
    try {
      const stmt = db.prepare(
        `SELECT * FROM users WHERE twitter_id = ?`
      );
      return stmt.get(twitterId) as User | undefined;
    } catch (error) {
      console.error(`Error getting user by twitter ID (${twitterId}):`, error);
      return undefined;
    }
  },
  
  /**
   * Get user by ID
   * @param userId - User ID
   * @returns User object or undefined if not found
   */
  getUserById: (userId: number): User | undefined => {
    try {
      const stmt = db.prepare(
        `SELECT * FROM users WHERE id = ?`
      );
      return stmt.get(userId) as User | undefined;
    } catch (error) {
      console.error(`Error getting user by ID (${userId}):`, error);
      return undefined;
    }
  },

  /**
   * Update user
   * @param userId - User ID
   * @param updates - Fields to update
   * @returns Updated user or undefined if not found
   */
  updateUser: (userId: number, updates: Partial<User>): User | undefined => {
    try {
      // Get the current user first
      const user = userService.getUserById(userId);
      if (!user) {
        return undefined;
      }
      
      // Prepare update fields
      const now = new Date().toISOString();
      updates.updated_at = now;
      
      // Build the SET clause
      const fields = Object.keys(updates)
        .filter(key => key !== 'id') // Don't update the primary key
        .map(key => `${key} = ?`);
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => updates[key]);
      
      // Add userId to values array
      values.push(userId);
      
      // Prepare and execute the statement
      const stmt = db.prepare(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);
      
      // Return the updated user
      return { ...user, ...updates };
    } catch (error) {
      console.error(`Error updating user ID (${userId}):`, error);
      return undefined;
    }
  },

  // Find user by Hedera account ID
  findUserByHederaAccountId: (hederaAccountId: string): User | null => {
    try {
      const db = new Database(path.resolve(dbDir, 'hedPay.sqlite'));
      
      // First get the user_id from the hedera_accounts table
      const accountResult = db.prepare(`
        SELECT user_id 
        FROM hedera_accounts 
        WHERE account_id = ?
      `).get(hederaAccountId) as { user_id: number } | undefined;
      
      if (!accountResult) {
        return null;
      }
      
      const userId = accountResult.user_id;
      
      // Then get the user record
      const userResult = db.prepare(`
        SELECT id, twitter_username, twitter_id, created_at, updated_at
        FROM users 
        WHERE id = ?
      `).get(userId) as {
        id: number;
        twitter_username: string;
        twitter_id: string;
        created_at: string;
        updated_at: string;
      } | undefined;
      
      db.close();
      
      if (!userResult) {
        return null;
      }
      
      // Create user object with Hedera account
      return {
        id: userResult.id,
        twitter_username: userResult.twitter_username,
        twitter_id: userResult.twitter_id,
        created_at: userResult.created_at,
        updated_at: userResult.updated_at,
        hedera_account_id: hederaAccountId
      };
    } catch (error) {
      console.error('Error finding user by Hedera account ID:', error);
      return null;
    }
  }
};

/**
 * Hedera Account Service
 * Handles Hedera account links and lookups
 */
export const hederaAccountService = {
  /**
   * Link a Hedera account to a user
   * @param userId - User ID
   * @param hederaAccountId - Hedera account ID
   * @param isPrimary - Whether this is the user's primary account
   * @param privateKey - Encrypted private key
   * @param publicKey - Public key
   * @param networkType - Hedera network type (testnet, mainnet, etc.)
   * @param keyType - Hedera key type (ED25519, etc.)
   * @returns The created account link
   */
  linkHederaAccount: (
    userId: number, 
    hederaAccountId: string, 
    isPrimary: boolean = true,
    privateKey?: string,
    publicKey?: string,
    networkType: string = 'testnet',
    keyType: string = 'ED25519'
  ): HederaAccount => {
    try {
      // Start transaction
      const transaction = db.transaction(() => {
        // If this is primary, make all other accounts non-primary
        if (isPrimary) {
          const updateStmt = db.prepare(
            `UPDATE hedera_accounts SET is_primary = 0 WHERE user_id = ?`
          );
          updateStmt.run(userId);
        }
        
        // Create new account link
        const now = new Date().toISOString();
        const insertStmt = db.prepare(
          `INSERT INTO hedera_accounts 
          (user_id, account_id, is_primary, private_key, public_key, network_type, key_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        const info = insertStmt.run(
          userId, 
          hederaAccountId, 
          isPrimary ? 1 : 0, 
          privateKey, 
          publicKey, 
          networkType, 
          keyType, 
          now
        );
        
        // Update user's primary Hedera account for easy lookup
        if (isPrimary) {
          userService.updateUser(userId, { hedera_account_id: hederaAccountId });
        }
        
        return {
          id: Number(info.lastInsertRowid),
          user_id: userId,
          account_id: hederaAccountId,
          is_primary: isPrimary ? 1 : 0,
          private_key: privateKey,
          public_key: publicKey,
          network_type: networkType,
          key_type: keyType,
          created_at: now
        };
      });
      
      // Execute transaction
      const result = transaction();
      console.log(`Linked Hedera account ${hederaAccountId} to user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error linking Hedera account ${hederaAccountId} to user ${userId}:`, error);
      throw new Error(`Failed to link Hedera account: ${error.message}`);
    }
  },

  /**
   * Get all Hedera accounts for a user
   * @param userId - User ID
   * @returns Array of Hedera accounts linked to the user
   */
  getAccountsForUser: (userId: number): HederaAccount[] => {
    try {
      const stmt = db.prepare(
        `SELECT * FROM hedera_accounts WHERE user_id = ?`
      );
      return stmt.all(userId) as HederaAccount[];
    } catch (error) {
      console.error(`Error getting Hedera accounts for user ID (${userId}):`, error);
      return [];
    }
  },
  
  /**
   * Get primary Hedera account for a user
   * @param userId - User ID
   * @returns Primary Hedera account or undefined if not found
   */
  getPrimaryAccountForUser: (userId: number): HederaAccount | undefined => {
    try {
      const stmt = db.prepare(
        `SELECT * FROM hedera_accounts WHERE user_id = ? AND is_primary = 1`
      );
      console.log("stmt",stmt)
      return stmt.get(userId) as HederaAccount | undefined;
    } catch (error) {
      console.error(`Error getting primary Hedera account for user ID (${userId}):`, error);
      return undefined;
    }
  },

  /**
   * Get Hedera credentials for a Twitter username
   * @param twitterUsername - Twitter username
   * @returns Hedera credentials object or undefined if not found
   */
  getHederaCredentials: (twitterUsername: string): {
    accountId: string;
    privateKey: string;
    publicKey: string;
    networkType: string;
    keyType: string;
  } | undefined => {
    try {
      const user = userService.getUserByTwitterUsername(twitterUsername);
      console.log("user",user)
      if (!user) {
        return undefined;
      }
      
      const account = hederaAccountService.getPrimaryAccountForUser(user.id);
      console.log("account",account)
      if (!account || !account.private_key || !account.public_key) {
        return undefined;
      }
      
      return {
        accountId: account.account_id,
        privateKey: account.private_key,
        publicKey: account.public_key,
        networkType: account.network_type || 'testnet',
        keyType: account.key_type || 'ED25519'
      };
    } catch (error) {
      console.error(`Error getting Hedera credentials for Twitter username (${twitterUsername}):`, error);
      return undefined;
    }
  }
  
};

/**
 * Saves a transaction to the local database
 * 
 * @param senderUsername - Twitter username of the sender
 * @param recipientUsername - Twitter username of the recipient (if applicable)
 * @param transactionId - Hedera transaction ID
 * @param transactionType - Type of transaction (TRANSFER, MINT_NFT, CREATE_TOKEN, etc.)
 * @param amount - Amount of tokens (as string)
 * @param tokenId - Token ID or HBAR for cryptocurrency
 * @param memo - Transaction memo or description
 * @param status - Transaction status (SUCCESS, FAILED)
 * @param networkType - Network type (testnet, mainnet)
 * @returns Promise<boolean> - Whether the operation was successful
 */
export async function saveTransaction(
  senderUsername: string,
  recipientUsername: string | null,
  transactionId: string,
  transactionType: string,
  amount: string,
  tokenId: string,
  memo: string,
  status: string,
  networkType: string
): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Get the user IDs for sender and recipient
    const senderId = await getUserIdFromTwitterUsername(senderUsername);
    
    if (!senderId) {
      console.log(`Could not find user ID for sender @${senderUsername}`);
      return false;
    }
    
    let recipientId = null;
    if (recipientUsername) {
      recipientId = await getUserIdFromTwitterUsername(recipientUsername);
    }
    
    // Insert transaction into the database
    const query = `
      INSERT INTO transactions (
        sender_id, 
        recipient_id, 
        transaction_id, 
        transaction_type, 
        amount, 
        token_id, 
        memo, 
        status, 
        network_type, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      senderId,
      recipientId,
      transactionId,
      transactionType,
      amount,
      tokenId,
      memo,
      status,
      networkType,
      new Date().toISOString()
    ];
    
    await db.run(query, params);
    
    console.log(`Transaction ${transactionId} saved to database`);
    return true;
  } catch (error) {
    console.error('Error saving transaction to database:', error);
    return false;
  }
}

/**
 * Helper function to get user ID from Twitter username
 * @param {string} username - Twitter username
 * @returns {Promise<string|null>} - User ID or null if not found
 */
async function getUserIdFromTwitterUsername(username) {
  try {

    // Query database first to check if the user already exists
    const db = await getDb();
    const user = await db.get(`SELECT id FROM users WHERE twitter_username = ?`, [username]);
    
    if (user) {
      return user.id;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting user ID from Twitter username: ${error.message}`);
    return null;
  }
}

/**
 * Gets the database connection
 * @returns A Promise that resolves to the database connection
 */
async function getDb() {
  // Assuming you're using a sqlite3 library with promises like sqlite or better-sqlite3 with promise wrapper
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');
  
  return open({
    filename: process.env.DATABASE_PATH || './db/hedPay.sqlite',
    driver: sqlite3.Database
  });
}

// Export a combined service for convenience
export default {
  user: userService,
  hederaAccount: hederaAccountService
}; 