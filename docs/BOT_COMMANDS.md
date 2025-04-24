# Hedera Twitter Pay Bot Commands

This document outlines all the commands supported by the Hedera Twitter Pay bot. Users can interact with the bot by mentioning it on Twitter using these commands.

## Account Management

### Register a Hedera Account

```
@HederaPayBot register 0.0.12345
@HederaPayBot register
```

**Notes:**
- If no account ID is provided, a new Hedera account will be created automatically
- The bot will DM the user their account credentials if a new account is created
- Only one primary Hedera account can be registered per Twitter account

**Response Examples:**
```
Successfully registered @YourTwitterName with Hedera account 0.0.5392887.

or

Created new Hedera account 0.0.5392887 for @YourTwitterName. Check your DMs for credentials.
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

### Check Specific Token Balance

```
@HederaPayBot what is my balance of TokenName?
@HederaPayBot show balance of token 0.0.5446064
```

**Response:**
```
Your balance of token USD Bar (0.0.5446064) is 10000 USDB.
```

## Token Transfers

### Send HBAR

```
@HederaPayBot send [amount] HBAR to @recipient
@HederaPayBot transfer [amount] HBAR to @recipient
```

**Response:**
```
Successfully transferred 5.5 HBAR to @CryptoFriend.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1739269481.061926306
```

### Send Custom Token

```
@HederaPayBot send [amount] [token] to @recipient
@HederaPayBot transfer [amount] [token] to @recipient
```

**Response:**
```
Successfully transferred 10 TTT to @CryptoFriend.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1739269394.302994738
```

## Token Creation

### Create Basic Token

```
@HederaPayBot create token [name] with symbol [symbol], [decimals] decimals, and starting supply of [amount]
```

**Response:**
```
Created new token GameGold (GG) with ID: 0.0.5478715
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738841329.271042438
```

### Create Advanced Token

```
@HederaPayBot create token [name] with symbol [symbol], [decimals] decimals, and starting supply of [amount]. Add supply key, admin key and metadata key. Set memo to '[memo]' and token metadata to '[metadata]'
```

**Response:**
```
Created new token BitcoinIsGold (BIG) with ID: 0.0.5526711

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

### Associate Token

```
@HederaPayBot associate token [token-id]
@HederaPayBot associate my wallet with token [token-id]
```

**Response:**
```
Token 0.0.5450063 has been associated with your account.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738313812.597816600
```

### Dissociate Token

```
@HederaPayBot dissociate token [token-id]
@HederaPayBot dissociate my wallet from token [token-id]
```

**Response:**
```
Token 0.0.5472930 has been dissociated from your account.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738744214.605233556
```

## Token Minting

### Mint Additional Supply

```
@HederaPayBot mint [amount] of token [token-id]
@HederaPayBot mint [amount] tokens [token-id]
```

**Response:**
```
Successfully minted 10000000 of tokens 0.0.5478757
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738849591.451351050
```

### Mint NFT

```
@HederaPayBot mint NFT [token-id] with metadata '[metadata]'
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

### Claim Airdrop

```
@HederaPayBot claim airdrop [token-id] from [account-id]
@HederaPayBot accept airdrop of token [token-id] from account [account-id]
```

**Response:**
```
Successfully claimed airdrop for token 0.0.5450643.
Transaction: https://hashscan.io/testnet/tx/0.0.4515756@1739271766.985013990
```

### Reject Token

```
@HederaPayBot reject token [token-id]
```

**Response:**
```
Successfully rejected token: 0.0.5445349.
Transaction: https://hashscan.io/testnet/tx/0.0.5393196@1738313027.916224718
```

## Tips for Success

1. Always register your Hedera account first
2. Ensure you have enough HBAR for transaction fees
3. Associate with tokens before receiving them
4. Double-check account and token IDs
5. Wait for transaction confirmation
6. Check your DMs for sensitive information

## Error Messages

Common error messages and their meanings:

- "You need to register first": Register your Hedera account
- "Insufficient funds": Add more HBAR to your account
- "Token association required": Associate with the token first
- "Invalid token ID": Check the token ID format
- "Transaction failed": Try again or check your balance

## Support

If you need help, mention the bot with:
```
@HederaPayBot help
@HederaPayBot commands
``` 