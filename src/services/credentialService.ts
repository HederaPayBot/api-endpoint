/**
 * Credential Service for Hedera Twitter Pay API
 * 
 * This service handles encrypting and decrypting user credentials
 * for secure storage and retrieval.
 */
import crypto from 'crypto';
import { hederaAccountService } from './sqliteDbService';

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-dev-only';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';


export const encryptSensitiveData = (data: string): string => {
  // In a production environment, use a more secure encryption method and store the key in a secure vault
  // This is a simplified example using AES-256-CBC with a hardcoded key and IV
  // DO NOT use this in production
  const encryptionKey = ENCRYPTION_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(encryptionKey.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Store IV with the encrypted data
};


/**

/**
 * Decrypt sensitive data
 * @param encrypted - The encrypted data string
 * @returns Decrypted data
 */
export const decryptSensitiveData = (encrypted: string): string => {
  try {
    const encryptionKey = ENCRYPTION_KEY;
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(encryptionKey.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
};

/**
 * Get decrypted Hedera credentials for a user
 * @param twitterUsername - Twitter username
 * @returns Hedera credentials with decrypted private key
 */
export const getDecryptedCredentialsForUser = (twitterUsername: string): {
  accountId: string;
  privateKey: string;
  publicKey: string;
  networkType: string;
  keyType: string;
} | undefined => {
  try {
    const credentials = hederaAccountService.getHederaCredentials(twitterUsername);
    if (!credentials) {
      return undefined;
    }
    
    // Decrypt the private key
    const decryptedPrivateKey = decryptSensitiveData(credentials.privateKey);
    
    return {
      ...credentials,
      privateKey: decryptedPrivateKey
    };
  } catch (error) {
    console.error(`Error getting decrypted credentials for ${twitterUsername}:`, error);
    return undefined;
  }
};

/**
 * Check if a user has registered Hedera credentials
 * @param twitterUsername - Twitter username
 * @returns Boolean indicating if user has valid credentials
 */
export const hasValidCredentials = (twitterUsername: string): boolean => {
  try {
    const credentials = hederaAccountService.getHederaCredentials(twitterUsername);
    return !!credentials && !!credentials.privateKey && !!credentials.publicKey;
  } catch (error) {
    console.error(`Error checking credentials for ${twitterUsername}:`, error);
    return false;
  }
};

export default {
  getDecryptedCredentialsForUser,
  hasValidCredentials
}; 