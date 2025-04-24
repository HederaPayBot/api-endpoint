# Hedera Twitter Pay API

Backend server for Hedera Twitter Pay application, now using `agent-twitter-client` for Twitter interactions without requiring a Premium or Enterprise account.

## Features

- **Twitter Mention Processing**: Automatically processes mentions to the bot account
- **Command Parsing**: Converts natural language commands in tweets to structured operations
- **Hedera Integration**: Executes blockchain operations through Eliza and the Hedera plugin
- **User Registration**: Allows users to register their Hedera accounts with their Twitter handles
- **Transaction Support**: Supports transfers, airdrops, token creation, and more

## Supported Commands

Users can mention the bot with various commands:

### Account Registration
```
@HederaPayBot register 0.0.12345
```

### Balance Checking
```
@HederaPayBot show my balance
@HederaPayBot what is my HBAR balance?
```

### Token Transfers
```
@HederaPayBot send 5 HBAR to @anotherUser
@HederaPayBot transfer 10 TOKEN to @someUser
```

### Airdrops
```
@HederaPayBot airdrop 10 TOKEN to @user1 @user2 @user3
```

### Token Creation
```
@HederaPayBot create token GameCoin with symbol GC, 2 decimals, and starting supply of 1000000
```
Add optional parameters:
```
@HederaPayBot create token GameCoin with symbol GC, 2 decimals, and starting supply of 1000000. Add supply key, admin key and metadata key. Set memo to 'Game token for in-app purchases' and token metadata to 'https://example.com/metadata.json'
```

### Token Holders
```
@HederaPayBot show token holders for 0.0.5450643
@HederaPayBot show the token holders for 0.0.5450643 with minimum balance 1000
```

### Mint Tokens
```
@HederaPayBot mint 100 tokens 0.0.5478757
@HederaPayBot increase supply of token 0.0.5478757 by 9999
```

### Mint NFTs
```
@HederaPayBot mint NFT 0.0.5512318 with metadata 'Testing this nft'
```

### Reject Token
```
@HederaPayBot reject token 0.0.5445349
@HederaPayBot I don't want to accept the token 0.0.542086 from airdrop. Reject it.
```

### Token Association
```
@HederaPayBot associate my wallet with token 0.0.5450063
@HederaPayBot dissociate my wallet with token 0.0.5472930
```

### HBAR Transfers
```
@HederaPayBot transfer 10 HBAR to account 0.0.5499760
@HederaPayBot send 1 HBAR to account 0.0.5392887
```

### HTS Token Transfers
```
@HederaPayBot transfer 10 of 0.0.5450643 to account 0.0.5499760
@HederaPayBot send 1 token 0.0.5450643 to account 0.0.5392887
```

### Claim and View Airdrops
```
@HederaPayBot claim airdrop of token 0.0.5450643 from account 0.0.5393196
@HederaPayBot show pending airdrops
@HederaPayBot show pending airdrops for the account with id 0.0.5499883
```

### Topic Operations
```
@HederaPayBot create topic with memo: test memo
@HederaPayBot create topic with memo: test memo. Please set submit key.
@HederaPayBot give me details about topic 0.0.5473398
@HederaPayBot submit message 'test test test' to topic 0.0.5475023
@HederaPayBot get messages from topic 0.0.5473710
@HederaPayBot get messages from topic 0.0.5473710 that were posted after 2025-02-06 and before 2025-02-07 07:35:31.000
@HederaPayBot delete topic with id 0.0.5500697
```

## Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and update with your credentials
4. Build the project: `pnpm build`
5. Start the server: `pnpm start`

## Twitter Integration

This project now uses the `agent-twitter-client` package instead of Twitter's official API. This approach doesn't require a Premium/Enterprise Twitter account and bypasses the need for webhook integration.

### Configure Twitter Credentials

The following environment variables need to be set in your `.env` file:

```
# Twitter Login Credentials (Required)
TWITTER_USERNAME=YourTwitterUsername
TWITTER_PASSWORD=YourTwitterPassword
TWITTER_EMAIL=your.email@example.com

# Twitter API v2 credentials (Optional - for advanced features)
TWITTER_API_KEY=YourTwitterAPIKey
TWITTER_API_KEY_SECRET=YourTwitterAPISecret
TWITTER_ACCESS_TOKEN=YourTwitterAccessToken
TWITTER_ACCESS_TOKEN_SECRET=YourTwitterAccessTokenSecret

# Twitter Bot Configuration
TWITTER_BOT_USERNAME=YourBotUsername
TWITTER_POLL_INTERVAL=60  # How often to check for mentions (in seconds)
```

### How It Works

Instead of using webhooks, this implementation:

1. Regularly polls for new mentions using the polling service
2. Processes mentions that contain commands
3. Sends replies using the Twitter client

The polling service automatically starts when you run the server, checking for new mentions at the interval specified in `TWITTER_POLL_INTERVAL`.

## API Endpoints

### Twitter Endpoints

- `GET /api/twitter/poll-mentions`: Manually trigger polling for mentions
- `GET /api/twitter/mentions`: Get recent mentions of your bot
- `POST /api/twitter/reply`: Send a test reply to a tweet
- `POST /api/twitter/test-command`: Test an Eliza command

### User Endpoints

- `POST /api/users/register`: Register a new user
- `GET /api/users/:twitterId`: Get user information

### Eliza Endpoints

- `POST /api/eliza/message`: Send a message to Eliza
- `GET /api/eliza/health`: Check Eliza service status

## Development

1. Start in development mode: `pnpm dev`
2. The server will restart automatically when source files change

## Testing Twitter Integration

You can test the Twitter integration with:

```bash
# Manually trigger mention processing
curl http://localhost:5001/api/twitter/poll-mentions

# Test a reply
curl -X POST http://localhost:5001/api/twitter/reply \
  -H "Content-Type: application/json" \
  -d '{"tweetId": "1234567890", "text": "Hello from the API!"}'
```

## Debugging

If you encounter issues with the Twitter client:

1. Check the server logs for error messages
2. Verify your Twitter credentials are correct 
3. Make sure the TWITTER_BOT_USERNAME is set correctly
4. Try increasing TWITTER_POLL_INTERVAL if you're facing rate limits

## Setup and Configuration

### Prerequisites

- Node.js 16+
- Twitter Developer Account with API access
- Hedera TestNet or MainNet account
- ElizaOS instance with Hedera plugin

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server configuration
PORT=5000
NODE_ENV=development

# Hedera configuration
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...
HEDERA_NETWORK_TYPE=testnet
HEDERA_KEY_TYPE=ED25519

# Twitter API configuration
TWITTER_API_KEY=xxx
TWITTER_API_KEY_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx
TWITTER_BOT_USERNAME=HederaPayBot

# Eliza configuration
ELIZA_API_URL=http://localhost:3000
ELIZA_AGENT_NAME=Hedera Helper
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd backend/api-endpoint
npm install
```

3. Build the project:

```bash
npm run build
```

4. Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## Architecture

### Components

- **Twitter Webhook Handler**: Processes Twitter account activity events
- **Command Parser**: Extracts structured commands from tweets
- **Eliza Service**: Communicates with the Eliza agent for Hedera operations
- **Database Service**: Stores user registrations and transaction history

### Flow

1. User mentions the bot with a command
2. Twitter webhook delivers the mention to our API
3. API parses the command and extracts parameters
4. Special commands (like registration) are handled directly
5. Blockchain commands are forwarded to Eliza agent
6. Eliza executes the operation via Hedera plugin
7. Response is sent back to the user as a tweet reply

## Deployment

### Production Setup

For production, consider using:
- PM2 for process management
- NGINX for reverse proxy
- SSL certificates for secure communication

Example PM2 configuration:

```json
{
  "apps": [{
    "name": "hedera-twitter-pay",
    "script": "dist/index.js",
    "instances": 1,
    "exec_mode": "fork",
    "env": {
      "NODE_ENV": "production",
      "PORT": 5000
    }
  }]
}
```

### Docker Support

A Dockerfile is provided for containerized deployment:

```bash
docker build -t hedera-twitter-pay .
docker run -p 5000:5000 --env-file .env hedera-twitter-pay
```

## Security Considerations

- All Twitter webhook endpoints validate the request source
- Sensitive operations require user registration first
- Environment variables should be securely managed
- In production, secure API keys and private keys with vault solutions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Hedera Hashgraph for the blockchain infrastructure
- ElizaOS for the agent framework
- Twitter for the API access 