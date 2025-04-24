# Hedera Twitter Pay Bot Commands

This document outlines all the commands supported by the Hedera Twitter Pay bot. Users can interact with the bot by mentioning it on Twitter using these commands.

## Account Registration

Before using blockchain features, users must register their Hedera account with the bot.

### Register a Hedera Account

```
@HederaPayBot register 0.0.12345
```

**Parameters:**
- Hedera account ID (in format 0.0.XXXXX)

**Example:**
```
@HederaPayBot register 0.0.5392887
```

**Response:**
```
Successfully registered @YourTwitterName with Hedera account 0.0.5392887.
```

## Balance Queries

### Check HBAR Balance

```
@HederaPayBot what is my HBAR balance?
@HederaPayBot show my HBAR balance
@HederaPayBot check HBAR balance
```

**Response:**
```
Your current HBAR balance is 100.25 HBAR.
```

### Check Token Balance

```
@HederaPayBot what is my token balance?
@HederaPayBot show my token balance
@HederaPayBot check token balance
```

**Response:**
```
Your token balances:
TokenTokenToken: 0.1 TTT
SkyCredits: 0.000025 SKC
MyToken: 2.1 MTK
CryptoCoin: 0.05 CCN
HederaDollar: 99.676 H$
```

### Check Balance of Specific Token

```
@HederaPayBot what is my balance of TokenName?
@HederaPayBot show balance of token 0.0.5446064
```

**Parameters:**
- Token name or ID

**Example:**
```
@HederaPayBot show balance of token 0.0.5446064
```

**Response:**
```
Your balance of token USD Bar (0.0.5446064) is 10000 USDB.
```

## Token Transfers

### Send HBAR to a Single User

```
@HederaPayBot send [amount] HBAR to @recipient
@HederaPayBot transfer [amount] HBAR to @recipient
```

**Parameters:**
- Amount: Numeric value
- Recipient: Twitter username with @ symbol

**Example:**
```
@HederaPayBot send 5.5 HBAR to @CryptoFriend
```

**Response:**
```
Successfully transferred 5.5 HBAR to @CryptoFriend.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1739269481.061926306
```

### Send Custom Token to a Single User

```
@HederaPayBot send [amount] [token] to @recipient
@HederaPayBot transfer [amount] [token] to @recipient
```

**Parameters:**
- Amount: Numeric value
- Token: Token symbol or ID
- Recipient: Twitter username with @ symbol

**Example:**
```
@HederaPayBot send 10 TTT to @CryptoFriend
```

**Response:**
```
Successfully transferred 10 TTT to @CryptoFriend.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1739269394.302994738
```

## Token Airdrops

### Airdrop Token to Multiple Users

```
@HederaPayBot airdrop [amount] [token] to @user1 @user2 @user3...
```

**Parameters:**
- Amount: Numeric value (per recipient)
- Token: Token symbol or ID
- Recipients: Multiple Twitter usernames with @ symbol (up to 10)

**Example:**
```
@HederaPayBot airdrop 25 TTT to @User1 @User2 @User3
```

**Response:**
```
Airdrop completed! Sent 25 TTT to 3 recipients.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738767753.145858310
```

## Token Creation

### Create a Basic Fungible Token

```
@HederaPayBot create token [name] with symbol [symbol], [decimals] decimals, and starting supply of [amount]
```

**Parameters:**
- Name: Token name
- Symbol: Short uppercase symbol for the token
- Decimals: Number of decimal places (0-18)
- Amount: Initial supply of tokens

**Example:**
```
@HederaPayBot create token GameGold with symbol GG, 2 decimals, and starting supply of 750000
```

**Response:**
```
Created new token GameGold (GG) with ID: 0.0.5478715
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738841329.271042438
```

### Create a Token with Additional Options

```
@HederaPayBot create token [name] with symbol [symbol], [decimals] decimals, and starting supply of [amount]. Add supply key, admin key and metadata key. Set memo to '[memo]' and token metadata to '[metadata]'
```

**Additional Parameters:**
- Supply Key: "Add supply key" allows minting more tokens later
- Admin Key: "Add admin key" allows administrative changes
- Metadata Key: "Add metadata key" allows metadata updates
- Memo: Optional memo text in quotes
- Token Metadata: Optional metadata in quotes

**Example:**
```
@HederaPayBot create token BitcoinIsGold with symbol BIG, 2 decimals, and starting supply of 12345. Add supply key, admin key and metadata key. Set memo to 'Game token' and token metadata to 'https://example.com/token.json'
```

**Response:**
```
Created new fungible token BitcoinIsGold (BIG) with ID: 0.0.5526711

Details:
Name: BitcoinIsGold
Symbol: BIG
Decimals: 2
Initial supply: 12345
Supply Key: Enabled
Metadata Key: Enabled
Admin Key: Enabled
Token Metadata: https://example.com/token.json
Memo: Game token

Transaction: https://hashscan.io/testnet/tx/0.0.5392887@1739795581.817796574
```

## Token Association

### Associate with a Token

```
@HederaPayBot associate token [token-id]
@HederaPayBot associate my wallet with token [token-id]
```

**Parameters:**
- Token-id: The Hedera token ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot associate token 0.0.5450063
```

**Response:**
```
Token 0.0.5450063 has been associated with your account.
Transaction: https://hashscan.io/testnet/transaction/1738313812.597816600
```

### Dissociate from a Token

```
@HederaPayBot dissociate token [token-id]
@HederaPayBot dissociate my wallet from token [token-id]
```

**Parameters:**
- Token-id: The Hedera token ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot dissociate token 0.0.5472930
```

**Response:**
```
Token 0.0.5472930 has been dissociated from your account.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738744214.605233556
```

## Token Minting

### Mint Additional Token Supply

Only works for tokens created with a supply key.

```
@HederaPayBot mint [amount] of token [token-id]
@HederaPayBot mint [amount] tokens [token-id]
```

**Parameters:**
- Amount: Numeric value to mint
- Token-id: The Hedera token ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot mint 10000000 tokens 0.0.5478757
```

**Response:**
```
Successfully minted 10000000 of tokens 0.0.5478757
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738849591.451351050
```

### Mint NFT

Only works for NFT collections created with a supply key.

```
@HederaPayBot mint NFT [token-id] with metadata '[metadata]'
```

**Parameters:**
- Token-id: The Hedera NFT collection ID (0.0.XXXXX format)
- Metadata: Metadata string or URL

**Example:**
```
@HederaPayBot mint NFT 0.0.5512318 with metadata 'Testing this nft'
```

**Response:**
```
Successfully minted NFT 0.0.5512318
Transaction: https://hashscan.io/testnet/tx/0.0.5392887@1739783546.150091504
```

## Airdrop Management

### View Pending Airdrops

```
@HederaPayBot show pending airdrops
@HederaPayBot show my pending airdrops
```

**Response:**
```
Here are pending airdrops for your account:

(1) 100 KLR (token id: 0.0.5450181) from 0.0.5393196
(2) 0.0006 H$ (token id: 0.0.5450643) from 0.0.5393196
```

### Claim an Airdrop

```
@HederaPayBot claim airdrop [token-id] from [account-id]
@HederaPayBot accept airdrop of token [token-id] from account [account-id]
```

**Parameters:**
- Token-id: The Hedera token ID (0.0.XXXXX format)
- Account-id: The Hedera account ID that sent the airdrop

**Example:**
```
@HederaPayBot claim airdrop 0.0.5450643 from 0.0.5393196
```

**Response:**
```
Successfully claimed airdrop for token 0.0.5450643.
Transaction: https://hashscan.io/testnet/tx/0.0.4515756@1739271766.985013990
```

### Reject a Token

```
@HederaPayBot reject token [token-id]
```

**Parameters:**
- Token-id: The Hedera token ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot reject token 0.0.5445349
```

**Response:**
```
Successfully rejected token: 0.0.5445349.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738313027.916224718
```

## Topic Management

### Create a Topic

```
@HederaPayBot create topic with memo: [memo]
@HederaPayBot create topic with memo: [memo]. Please set submit key.
```

**Parameters:**
- Memo: Short description text
- Submit Key (optional): Add "Please set submit key" to protect topic submissions

**Example:**
```
@HederaPayBot create topic with memo: Hedera Hackathon Updates. Please set submit key.
```

**Response:**
```
Topic with id: 0.0.5499850 created successfully.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738758985.176879241
```

### Submit Message to Topic

```
@HederaPayBot submit message '[message]' to topic [topic-id]
```

**Parameters:**
- Message: Text message to submit
- Topic-id: The Hedera topic ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot submit message 'Hello Hedera world!' to topic 0.0.5475023
```

**Response:**
```
Successfully submitted message to topic: 0.0.5475023
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738767753.145858310
```

### Get Topic Messages

```
@HederaPayBot get messages from topic [topic-id]
@HederaPayBot get messages from topic [topic-id] that were posted after [date] and before [date]
```

**Parameters:**
- Topic-id: The Hedera topic ID (0.0.XXXXX format)
- After date (optional): Starting date (e.g., "2025-02-06")
- Before date (optional): Ending date (e.g., "2025-02-07")

**Example:**
```
@HederaPayBot get messages from topic 0.0.5473710 that were posted after 2025-02-06
```

**Response:**
```
Messages for topic 0.0.5473710:
-----------------------
Author: 0.0.5393196
Body: Lorem ipsum dolor sit amet
Timestamp: 2025-02-07T07:36:17.144Z
-----------------------
Author: 0.0.5393196
Body: Another message
Timestamp: 2025-02-07T07:35:31.000Z
```

### Get Topic Info

```
@HederaPayBot show topic info [topic-id]
@HederaPayBot give me details about topic [topic-id]
```

**Parameters:**
- Topic-id: The Hedera topic ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot give me details about topic 0.0.5473398
```

**Response:**
```
Topic info for topic with id 0.0.5473398:
--------------------------------------
Memo: SimulatedTwins Verifiable Credentials Topic
Creation time: 2025-02-05T08:22:06.917Z
Expiration time: 2025-02-05T08:22:06.917Z
Admin key: not available
Submit key: e3b93603b0d533767e5ba73ffd6136a59b8554d322268ed4c92d7209efee472b (type: ED25519)
Deleted: false
--------------------------------------
Link: https://hashscan.io/testnet/topic/0.0.5473398
```

### Delete a Topic

```
@HederaPayBot delete topic [topic-id]
```

**Parameters:**
- Topic-id: The Hedera topic ID (0.0.XXXXX format)

**Example:**
```
@HederaPayBot delete topic 0.0.5500697
```

**Response:**
```
Successfully deleted topic 0.0.5500697.
Transaction: https://hashscan.io/testnet/tx/0.0.4515756@1739281029.698340079
```

## Tips for Successful Commands

1. Always **register your Hedera account** before trying other operations
2. Make sure your Hedera account has enough HBAR for transaction fees
3. When transferring tokens, ensure the recipient has registered their account
4. For tokens, use either the token symbol (like "HBAR" or "TTT") or the token ID (like "0.0.5446064")
5. Double-check all account IDs and token IDs before submitting transactions
6. Be patient - blockchain transactions may take a few seconds to process

## Bot Response Format

Bot responses typically include:
- Confirmation of the action performed
- Relevant details (e.g., token ID, balance)
- Transaction link to HashScan for verification

## Error Messages

Common error messages and what they mean:

- **"I couldn't find a Hedera account for @user"**: The mentioned user hasn't registered their Hedera account with the bot
- **"You're not registered"**: You need to register your Hedera account first
- **"Insufficient funds"**: Your account doesn't have enough tokens or HBAR
- **"Token association required"**: You need to associate with the token before receiving it
- **"Error processing your request"**: A general error occurred; try again later 