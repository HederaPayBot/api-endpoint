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
        description: "Check API health and service status",
        example: "curl http://localhost:5001/api/health"
      },
      users: {
        register: {
          url: "/api/users/register",
          method: "POST",
          description: "Register a new user with Twitter and Hedera credentials",
          example: "curl -X POST http://localhost:5001/api/users/register -H 'Content-Type: application/json' -d '{\"twitterUsername\": \"[username]\", \"twitterId\": \"[twitter_id]\", \"hederaAccountId\": \"[hedera_account_id]\"}'",
        },
        profile: {
          url: "/api/users/profile/:username",
          method: "GET",
          description: "Get user profile by Twitter username",
          example: "curl http://localhost:5001/api/users/profile/[twitter_username]"
        },
        linkStatus: {
          url: "/api/users/link-status/:username",
          method: "GET",
          description: "Check if a Twitter user has linked their Hedera account",
          example: "curl http://localhost:5001/api/users/link-status/[twitter_username]"
        }
      },
      twitter: {
        pollMentions: {
          url: "/api/twitter/poll-mentions",
          method: "GET",
          description: "Manually trigger polling for Twitter mentions",
          example: "curl http://localhost:5001/api/twitter/poll-mentions"
        },
        mentions: {
          url: "/api/twitter/mentions",
          method: "GET",
          description: "Get recent Twitter mentions (for testing/dev)",
          example: "curl http://localhost:5001/api/twitter/mentions"
        },
        reply: {
          url: "/api/twitter/reply",
          method: "POST",
          description: "Send a test reply to a tweet (for testing/dev)",
          example: "curl -X POST http://localhost:5001/api/twitter/reply -H 'Content-Type: application/json' -d '{\"tweetId\": \"[tweet_id]\", \"text\": \"[reply_text]\"}'",
        },
        testCommand: {
          url: "/api/twitter/test-command",
          method: "POST",
          description: "Test command processing without Twitter interaction",
          example: "curl -X POST http://localhost:5001/api/twitter/test-command -H 'Content-Type: application/json' -d '{\"command\": \"[command_text]\", \"userId\": \"[user_id]\", \"userName\": \"[username]\"}'",
        },
        testAutoCreateAccount: {
          url: "/api/twitter/test-auto-create-account",
          method: "POST",
          description: "Test automatic Hedera account creation for a Twitter user",
          example: "curl -X POST http://localhost:5001/api/twitter/test-auto-create-account -H 'Content-Type: application/json' -d '{\"twitterUsername\": \"[username]\", \"initialBalance\": 1}'",
        }
      },
      eliza: {
        message: {
          url: "/api/eliza/message",
          method: "POST",
          description: "Send a message to the Eliza agent for processing",
          example: "curl -X POST http://localhost:5001/api/eliza/message -H 'Content-Type: application/json' -d '{\"text\": \"[command]\", \"userId\": \"[user_id]\", \"userName\": \"[username]\"}'",
        },
        status: {
          url: "/api/eliza/status",
          method: "GET",
          description: "Check Eliza service status",
          example: "curl http://localhost:5001/api/eliza/status"
        }
      }
    }
  };

  return res.status(200).json(apiDocs);
});

export default router; 