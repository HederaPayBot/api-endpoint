import { Router } from 'express';

const router = Router();

// API documentation endpoint
router.get('/', (req, res) => {
  // API documentation with example curl commands
  const apiDocs = {
    description: "API Endpoints Documentation",
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      health: {
        url: "/api/health",
        method: "GET",
        description: "Check API health",
        example: "curl http://localhost:5001/api/health"
      },
      users: {
        register: {
          url: "/api/users/register",
          method: "POST",
          description: "Register a new user",
          example: "curl -X POST http://localhost:5001/api/users/register -H 'Content-Type: application/json' -d '{\"twitterUsername\": \"[new_twitter_username]\", \"twitterId\": \"[twitter_user_id]\"}'"
        },
        profile: {
          url: "/api/users/:twitterUsername",
          method: "GET",
          description: "Get user profile by Twitter username",
          example: "curl http://localhost:5001/api/users/[twitter_username]"
        },
        linkHedera: {
          url: "/api/users/:twitterUsername/link-hedera",
          method: "PUT",
          description: "Link Hedera account to Twitter user",
          example: "curl -X PUT http://localhost:5001/api/users/[twitter_username]/link-hedera -H 'Content-Type: application/json' -d '{\"hederaAccountId\": \"[hedera_account_id]\"}'"
        },
        getHederaAccount: {
          url: "/api/users/:twitterUsername/hedera-account",
          method: "GET",
          description: "Get Hedera account linked to Twitter user",
          example: "curl http://localhost:5001/api/users/[twitter_username]/hedera-account"
        }
      },
      mapAccount: {
        url: "/api/map-account",
        method: "POST",
        description: "Map Twitter username to Hedera account",
        example: "curl -X POST http://localhost:5001/api/map-account -H 'Content-Type: application/json' -d '{\"twitterUsername\": \"[twitter_username]\", \"hederaAccountId\": \"[hedera_account_id]\"}'"
      },
      twitter: {
        webhookCrc: {
          url: "/api/twitter/webhook/crc",
          method: "GET",
          description: "Twitter CRC token validation",
          example: "curl 'http://localhost:5001/api/twitter/webhook/crc?crc_token=[crc_token_value]'"
        },
        webhook: {
          url: "/api/twitter/webhook",
          method: "POST",
          description: "Twitter webhook for receiving events (Requires valid Twitter payload structure)",
          example: "curl -X POST http://localhost:5001/api/twitter/webhook -H 'Content-Type: application/json' -d '[valid_twitter_event_payload]'"
        },
        mentions: {
          url: "/api/twitter/mentions",
          method: "GET",
          description: "Get recent Twitter mentions (for testing/dev)",
          example: "curl http://localhost:5001/api/twitter/mentions"
        },
        testReply: {
          url: "/api/twitter/reply",
          method: "POST",
          description: "Send a test reply to Twitter (for testing/dev)",
          example: "curl -X POST http://localhost:5001/api/twitter/reply -H 'Content-Type: application/json' -d '{\"inReplyToTweetId\": \"[target_tweet_id]\", \"text\": \"Your reply text\"}'"
        },
        testCommand: {
          url: "/api/twitter/test-command",
          method: "POST",
          description: "Test Eliza command processing (for testing/dev)",
          example: "curl -X POST http://localhost:5001/api/twitter/test-command -H 'Content-Type: application/json' -d '{\"command\": \"[eliza_command]\", \"userId\": \"[user_identifier]\", \"userName\": \"[user_name]\"}'"
        }
      },
      payment: {
        create: {
          url: "/api/payment",
          method: "POST",
          description: "Create a new payment (via Eliza service)",
          example: "curl -X POST http://localhost:5001/api/payment -H 'Content-Type: application/json' -d '{\"senderUsername\": \"[sender_twitter_username]\", \"recipientUsername\": \"[recipient_twitter_username]\", \"amount\": [payment_amount]}'"
        },
        history: {
          url: "/api/payment/history/:twitterUsername",
          method: "GET",
          description: "Get payment history for a user",
          example: "curl http://localhost:5001/api/payment/history/[twitter_username]"
        },
        transaction: {
          url: "/api/payment/:transactionId",
          method: "GET",
          description: "Get details of a specific payment",
          example: "curl http://localhost:5001/api/payment/[transaction_id]"
        }
      },
      eliza: {
        directAccess: {
          url: "http://localhost:3000/Hedera%20Helper/message",
          method: "POST",
          description: "Direct access to Eliza service (external)",
          example: "curl -X POST http://localhost:3000/Hedera%20Helper/message -H 'Content-Type: application/json' -d '{\"text\": \"[eliza_command]\", \"userId\": \"[user_identifier]\", \"userName\": \"[user_name]\"}'"
        }
      }
    }
  };

  return res.status(200).json(apiDocs);
});

export default router; 