# API Usage Guide

This document provides examples and explanations for using the Hedera Twitter Pay API endpoints.

## User Registration and Management

### Register a New User

Register a user with their Twitter username and optional Hedera account credentials.

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
> - `twitterId` is optional and will be fetched from Twitter if not provided
> - `hederaAccountId` is optional - if not provided, a new account will be created
> - `hederaNetworkType` defaults to "testnet"
> - `hederaKeyType` defaults to "ED25519"
> - Private keys are encrypted before storage

**Response:**

```json
{
  "success": true,
  "message": "Successfully registered @yourTwitterUsername",
  "data": {
    "twitterUsername": "yourTwitterUsername",
    "hederaAccountId": "0.0.12345",
    "registeredAt": "2024-03-15T12:30:45.000Z"
  }
}
```

### Get User Profile

Retrieve a user's profile information including their Hedera account details.

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
    "registeredAt": "2024-03-15T12:30:45.000Z",
    "hederaAccounts": [
      {
        "accountId": "0.0.12345",
        "isPrimary": true,
        "linkedAt": "2024-03-15T12:30:45.000Z"
      }
    ]
  }
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

## Twitter Integration

### Poll for Mentions

Manually trigger the polling service to check for new mentions.

```
GET /api/twitter/poll-mentions
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully processed mentions",
  "processed": 5
}
```

### Get Recent Mentions

Get recent mentions of the bot account (for development/testing).

```
GET /api/twitter/mentions
```

**Response:**

```json
{
  "success": true,
  "mentions": [
    {
      "id": "1234567890",
      "text": "@HederaPayBot show my balance",
      "author": {
        "username": "someUser",
        "id": "987654321"
      },
      "created_at": "2024-03-15T12:30:45.000Z"
    }
  ]
}
```

### Send Test Reply

Send a test reply to a tweet (for development/testing).

```
POST /api/twitter/reply
```

**Request Body:**

```json
{
  "tweetId": "1234567890",
  "text": "@someUser Your balance is 100 HBAR."
}
```

**Response:**

```json
{
  "success": true,
  "tweet": {
    "id": "9876543210",
    "text": "@someUser Your balance is 100 HBAR."
  }
}
```

### Test Command Processing

Test command processing without actual Twitter interaction.

```
POST /api/twitter/test-command
```

**Request Body:**

```json
{
  "command": "show my balance",
  "userId": "1234567890",
  "userName": "testUser"
}
```

**Response:**

```json
{
  "success": true,
  "response": "Your current balance is 100 HBAR.",
  "transaction_id": "0.0.12345@1620000000.000000000"
}
```

## Eliza Integration

### Send Message to Eliza

Send a message to the Eliza agent for processing.

```
POST /api/eliza/message
```

**Request Body:**

```json
{
  "text": "What is my HBAR balance?",
  "userId": "1234567890",
  "userName": "testUser"
}
```

**Response:**

```json
{
  "success": true,
  "response": "Your current balance is 100 HBAR.",
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

## Security Considerations

1. All endpoints require appropriate authentication
2. Rate limiting is implemented on all endpoints
3. Private keys are encrypted before storage
4. Input validation is performed on all requests
5. Sensitive data is never logged

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400` for client errors (missing/invalid parameters)
- `401` for authentication errors
- `404` for not found errors
- `429` for rate limit exceeded
- `500` for server errors

Error responses follow this format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
``` 