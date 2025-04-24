// /**
//  * Migration script to move data from in-memory DB to SQLite
//  * 
//  * Run this script to migrate existing data from the old in-memory database
//  * to the new SQLite database.
//  */
// import { userService as inMemoryUserService, hederaAccountService as inMemoryHederaService } from '../services/dbService';
// import { userService as sqliteUserService, hederaAccountService as sqliteHederaService } from '../services/sqliteDbService';

// // Function to migrate users and their Hedera accounts
// async function migrateData() {
//   console.log('Starting migration to SQLite...');
  
//   try {
//     // Get all users from in-memory DB
//     // Since we don't have a direct method to get all users, we'll adapt
//     const allUsers = [];
    
//     // This is a workaround to access the in-memory database
//     // In a real migration, you'd have a proper way to get all users
//     const dbAny = (inMemoryUserService as any);
//     if (dbAny.getAllUsers) {
//       allUsers.push(...dbAny.getAllUsers());
//     } else {
//       console.log('No direct method to get all users. Migration may be incomplete.');
//       console.log('You may need to implement a different migration strategy.');
//       return;
//     }
    
//     console.log(`Found ${allUsers.length} users to migrate`);
    
//     // Migrate each user and their Hedera accounts
//     for (const user of allUsers) {
//       console.log(`Migrating user: ${user.twitter_username}`);
      
//       // Create user in SQLite
//       const newUser = sqliteUserService.createUser(
//         user.twitter_username,
//         user.twitter_id
//       );
      
//       // Get all Hedera accounts for this user
//       const accounts = inMemoryHederaService.getAccountsForUser(user.id);
      
//       for (const account of accounts) {
//         console.log(`Migrating Hedera account: ${account.account_id} for user ${user.twitter_username}`);
        
//         // Link Hedera account in SQLite
//         sqliteHederaService.linkHederaAccount(
//           newUser.id,
//           account.account_id,
//           account.is_primary,
//           account.private_key,
//           account.public_key,
//           account.network_type,
//           account.key_type
//         );
//       }
//     }
    
//     console.log('Migration completed successfully');
//   } catch (error) {
//     console.error('Error during migration:', error);
//   }
// }

// // Run the migration
// migrateData().catch(console.error); 