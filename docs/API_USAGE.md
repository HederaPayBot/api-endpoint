# API Usage Guide

This document provides examples and explanations for using the Hedera Twitter Pay API endpoints.

## User Registration and Management

### Register a New User

Register a user with their Twitter username and Hedera account credentials.

```
POST /api/users/register
```

**Request Body:**

```json
{
  "twitterUsername": "yourTwitterUsername",
  "twitterId": "1234567890",
  "hederaAccountId": "0.0.12345",
  "hederaPrivateKey": "302e020100300506032b657004220420424cc90352e7bfcf70276885ab453d62f70a65dfb03232065a49ba6122716904",
  "hederaPublicKey": "0x424cc90352e7bfcf70276885ab453d62f70a65dfb03232065a49ba6122716904",
  "hederaNetworkType": "testnet",
  "hederaKeyType": "ED25519"
}
```

> Notes: 
> - `twitterId` is optional. If not provided, a placeholder ID will be generated.
> - `hederaNetworkType` defaults to "testnet" if not provided.
> - `hederaKeyType` defaults to "ED25519" if not provided.
> - Private keys are encrypted before storage.

**Response:**

```json
{
  "success": true,
  "message": "Successfully registered @yourTwitterUsername with Hedera account 0.0.12345"
}
```

### Get User Profile

Retrieve a user's profile information including their Hedera accounts.

```
GET /api/users/profile/:username
```

**Response:**

```json
{
  "success": true,
  "user": {
    "twitterUsername": "yourTwitterUsername",
    "twitterId": "1234567890",
    "registeredAt": "2023-04-15T12:30:45.000Z",
    "hederaAccounts": [
      {
        "accountId": "0.0.12345",
        "isPrimary": true,
        "linkedAt": "2023-04-15T12:30:45.000Z"
      }
    ]
  }
}
```

### Update User Profile

Update a user's profile, including adding a new Hedera account.

```
PUT /api/users/profile
```

**Request Body:**

```json
{
  "twitterUsername": "yourTwitterUsername",
  "hederaAccountId": "0.0.54321",
  "hederaPrivateKey": "302e020100300506032b6570042204203b3aae5ca9ebd98f33a494ca9aad2f53e90b7ffe31a9550f474c6f38e24af0bd",
  "hederaPublicKey": "0x3b3aae5ca9ebd98f33a494ca9aad2f53e90b7ffe31a9550f474c6f38e24af0bd",
  "makeDefault": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Hedera account 0.0.54321 linked to @yourTwitterUsername as primary account"
}
```

### Check Link Status

Check if a Twitter user has linked their Hedera account.

```
GET /api/users/link-status/:username
```

**Response (when linked):**

```json
{
  "success": true,
  "linked": true,
  "hederaAccount": "0.0.12345"
}
```

**Response (when not linked):**

```json
{
  "success": true,
  "linked": false
}
```

## Eliza Integration

### Forward Message to Eliza

Send a message to the Eliza agent for processing. The API will automatically include the user's Hedera credentials if they are registered.

```
POST /api/eliza/message
```

**Request Body:**

```json
{
  "text": "What is my HBAR balance?",
  "userId": "1234567890",
  "userName": "yourTwitterUsername"
}
```

**Response:**

The response will vary based on Eliza's processing of the command. Example:

```json
{
  "text": "Your current balance is 100 HBAR.",
  "transaction_id": "0.0.12345@1620000000.000000000"
}
```

### Check Eliza Status

Check if the Eliza service is available.

```
GET /api/eliza/status
```

**Response:**

```json
{
  "success": true,
  "available": true,
  "url": "http://localhost:3000",
  "agent": "Hedera Helper",
  "details": {
    "status": "running",
    "version": "1.0.0"
  }
}
```

## Twitter Integration

### Get Recent Mentions

Get recent mentions of the bot's Twitter account (development only).

```
GET /api/twitter/mentions
```

**Response:**

```json
{
  "mentions": [
    {
      "id": "1234567890",
      "text": "@HederaPayBot show my balance",
      "created_at": "2023-04-15T12:30:45.000Z"
    }
  ]
}
```

### Send Test Reply

Send a test reply to a tweet (development only).

```
POST /api/twitter/reply
```

**Request Body:**

```json
{
  "tweet_id": "1234567890",
  "text": "@someUser Your balance is 100 HBAR."
}
```

**Response:**

```json
{
  "result": {
    "data": {
      "id": "9876543210",
      "text": "@someUser Your balance is 100 HBAR."
    }
  }
}
```

## Security Considerations

This API handles sensitive cryptographic keys. Important security notes:

1. In production, ensure all API endpoints are served over HTTPS
2. Private keys are encrypted before storage using AES-256-CBC
3. Set a strong `ENCRYPTION_KEY` in your environment variables
4. Consider using a hardware security module (HSM) for production deployments
5. User credentials are only transmitted to the Eliza service over a secure connection

## Error Handling

All endpoints return appropriate status codes and error messages:

- `400` for client errors (missing parameters, invalid format)
- `404` for not found errors
- `500` for server errors

Error responses have this format:

```json
{
  "success": false,
  "error": "Error message explaining what went wrong"
}
``` 