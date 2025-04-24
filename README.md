# Hedera Twitter Pay API

Backend server for Hedera Twitter Pay application, using `agent-twitter-client` for Twitter interactions without requiring a Premium or Enterprise account.

## Features

- **Twitter Integration**: Automated mention processing using polling service
- **Command Parsing**: Natural language command processing for tweets
- **Hedera Integration**: Direct blockchain operations through Eliza agent
- **User Registration**: Twitter-to-Hedera account mapping
- **Transaction Support**: HBAR transfers, token operations, and more

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

This project uses the `agent-twitter-client` package for Twitter interactions. This approach:
- Doesn't require a Premium/Enterprise Twitter account
- Uses polling instead of webhooks
- Supports all necessary Twitter operations

### Configure Twitter Credentials

Required environment variables in `.env`:

```bash
# Twitter Login Credentials (Required)
TWITTER_USERNAME=YourTwitterUsername
TWITTER_PASSWORD=YourTwitterPassword
TWITTER_EMAIL=your.email@example.com

# Twitter Bot Configuration
TWITTER_BOT_USERNAME=YourBotUsername
TWITTER_POLL_INTERVAL=60  # Polling interval in seconds

# Optional Twitter API Credentials (for advanced features)
TWITTER_API_KEY=YourTwitterAPIKey
TWITTER_API_KEY_SECRET=YourTwitterAPISecret
TWITTER_ACCESS_TOKEN=YourTwitterAccessToken
TWITTER_ACCESS_TOKEN_SECRET=YourTwitterAccessTokenSecret
```

### How It Works

The Twitter integration:
1. Uses a polling service to check for new mentions
2. Processes mentions containing commands
3. Executes commands through the Eliza agent
4. Sends responses back as tweet replies

The polling service starts automatically with the server and checks for mentions at the interval specified by `TWITTER_POLL_INTERVAL`.

## API Endpoints

### Twitter Endpoints
- `GET /api/twitter/poll-mentions`: Manually trigger mention polling
- `GET /api/twitter/mentions`: Get recent bot mentions
- `POST /api/twitter/reply`: Send a reply to a tweet
- `POST /api/twitter/test-command`: Test command processing
- `POST /api/twitter/test-auto-create-account`: Test automatic account creation

### User Endpoints
- `POST /api/users/register`: Register a new user
- `GET /api/users/profile/:username`: Get user profile
- `GET /api/users/link-status/:username`: Check Hedera account link status

### Eliza Endpoints
- `POST /api/eliza/message`: Send message to Eliza
- `GET /api/eliza/status`: Check Eliza service status

## Development

1. Start in development mode:
```bash
pnpm dev
```

2. Test Twitter integration:
```bash
# Manually trigger mention processing
curl http://localhost:5001/api/twitter/poll-mentions

# Test a reply
curl -X POST http://localhost:5001/api/twitter/reply \
  -H "Content-Type: application/json" \
  -d '{"tweetId": "1234567890", "text": "Hello!"}'
```

## Debugging

If you encounter Twitter client issues:

1. Check server logs for error messages
2. Verify Twitter credentials in `.env`
3. Ensure `TWITTER_BOT_USERNAME` is correct
4. Try increasing `TWITTER_POLL_INTERVAL` if rate limited
5. Check Eliza service connection

## Environment Variables

Create a `.env` file with:

```bash
# Server configuration
PORT=5001
NODE_ENV=development

# Hedera configuration
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...
HEDERA_NETWORK_TYPE=testnet
HEDERA_KEY_TYPE=ED25519

# Twitter configuration (see above)

# Eliza configuration
ELIZA_API_URL=http://localhost:3000
ELIZA_AGENT_NAME=Hedera Helper
```

## Production Deployment

For production:
- Use PM2 for process management
- Set up NGINX reverse proxy
- Enable SSL/TLS
- Use secure key management
- Monitor the polling service

Example PM2 config:
```json
{
  "apps": [{
    "name": "hedera-twitter-pay",
    "script": "dist/index.js",
    "instances": 1,
    "exec_mode": "fork",
    "env_production": {
      "NODE_ENV": "production",
      "PORT": 5001
    }
  }]
}
```

## Security Considerations

- Twitter credentials are stored securely
- Hedera private keys are encrypted
- Rate limiting is implemented
- Input validation on all endpoints
- Secure environment variable handling

## Contributing

Contributions welcome! Please submit pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Hedera Hashgraph for the blockchain infrastructure
- ElizaOS for the agent framework
- Twitter for the API access 