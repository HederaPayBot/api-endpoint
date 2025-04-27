import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hedera Twitter Pay API',
      version: '1.0.0',
      description: 'API for Hedera Twitter Pay application',
      license: {
        name: 'ISC',
      },
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5001',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['twitterUsername', 'twitterId', 'hederaAccountId'],
          properties: {
            twitterUsername: {
              type: 'string',
              description: 'Twitter username'
            },
            twitterId: {
              type: 'string',
              description: 'Twitter ID'
            },
            hederaAccountId: {
              type: 'string',
              description: 'Hedera account ID'
            }
          }
        },
        Tweet: {
          type: 'object',
          properties: {
            tweetId: {
              type: 'string',
              description: 'ID of the tweet'
            },
            text: {
              type: 'string',
              description: 'Text content of the reply'
            }
          }
        },
        Command: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command text'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            userName: {
              type: 'string',
              description: 'Username'
            }
          }
        },
        ElizaMessage: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Message text'
            },
            userId: {
              type: 'string', 
              description: 'User ID'
            },
            userName: {
              type: 'string',
              description: 'Username'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: ['number', 'null'],
              description: 'Local database ID (null for Mirror Node transactions)'
            },
            hedera_transaction_id: {
              type: 'string',
              description: 'Hedera transaction ID'
            },
            transaction_type: {
              type: 'string',
              description: 'Type of transaction (TRANSFER, CRYPTOTRANSFER, etc.)'
            },
            amount: {
              type: 'string',
              description: 'Transaction amount'
            },
            token_id: {
              type: 'string',
              description: 'Token ID (HBAR for cryptocurrency transfers)'
            },
            timestamp: {
              type: 'string',
              description: 'Transaction timestamp'
            },
            sender_username: {
              type: 'string',
              description: 'Twitter username of sender'
            },
            recipient_username: {
              type: 'string',
              description: 'Twitter username of recipient'
            },
            status: {
              type: 'string',
              description: 'Transaction status (SUCCESS, FAILED, etc.)'
            },
            memo: {
              type: 'string',
              description: 'Transaction memo'
            },
            network_type: {
              type: 'string',
              description: 'Hedera network type (testnet, mainnet)'
            },
            source: {
              type: 'string',
              description: 'Data source (local_db or mirror_node)'
            }
          }
        },
        TokenBalance: {
          type: 'object',
          properties: {
            tokenId: {
              type: 'string',
              description: 'Token ID (HBAR for cryptocurrency)'
            },
            tokenName: {
              type: 'string',
              description: 'Token name'
            },
            tokenSymbol: {
              type: 'string',
              description: 'Token symbol'
            },
            balance: {
              type: 'string',
              description: 'Token balance'
            },
            type: {
              type: 'string',
              description: 'Token type (CRYPTOCURRENCY, FUNGIBLE_COMMON, NON_FUNGIBLE_UNIQUE)'
            },
            decimals: {
              type: 'number',
              description: 'Token decimal places'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            message: {
              type: 'string',
              example: 'Hedera Twitter Pay API is running'
            },
            twitterIntegration: {
              type: 'string',
              example: 'running'
            },
            twitterPolling: {
              type: 'string',
              example: 'active'
            },
            pollingInterval: {
              type: 'string',
              example: '60 seconds'
            },
            hederaClient: {
              type: 'string',
              example: 'running'
            },
            environment: {
              type: 'string',
              example: 'development'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Twitter',
        description: 'Twitter integration endpoints'
      },
      {
        name: 'HederaBot',
        description: 'HederaBot agent endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes files
};

const specs = swaggerJsdoc(swaggerOptions);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health and service status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user with Twitter and Hedera credentials
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User registration successful
 *       400:
 *         description: Invalid request parameters
 */

/**
 * @swagger
 * /api/users/profile/{username}:
 *   get:
 *     summary: Get user profile by Twitter username
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/link-status/{username}:
 *   get:
 *     summary: Check if a Twitter user has linked their Hedera account
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *     responses:
 *       200:
 *         description: Link status
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/twitter/poll-mentions:
 *   get:
 *     summary: Manually trigger polling for Twitter mentions
 *     tags: [Twitter]
 *     responses:
 *       200:
 *         description: Polling triggered
 */

/**
 * @swagger
 * /api/twitter/mentions:
 *   get:
 *     summary: Get recent Twitter mentions (for testing/dev)
 *     tags: [Twitter]
 *     responses:
 *       200:
 *         description: Recent mentions
 */

/**
 * @swagger
 * /api/twitter/reply:
 *   post:
 *     summary: Send a test reply to a tweet (for testing/dev)
 *     tags: [Twitter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tweet'
 *     responses:
 *       200:
 *         description: Reply sent
 *       400:
 *         description: Invalid request parameters
 */

/**
 * @swagger
 * /api/twitter/test-command:
 *   post:
 *     summary: Test command processing without Twitter interaction
 *     tags: [Twitter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Command'
 *     responses:
 *       200:
 *         description: Command processed
 *       400:
 *         description: Invalid request parameters
 */

/**
 * @swagger
 * /api/twitter/test-auto-create-account:
 *   post:
 *     summary: Test automatic Hedera account creation for a Twitter user
 *     tags: [Twitter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               twitterUsername:
 *                 type: string
 *               initialBalance:
 *                 type: number
 *     responses:
 *       200:
 *         description: Account created
 *       400:
 *         description: Invalid request parameters
 */

/**
 * @swagger
 * https://localhost:3000/HederaBot/message:
 *   post:
 *     summary: Send a message to the Eliza agent for processing
 *     tags: [Eliza]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElizaMessage'
 *     responses:
 *       200:
 *         description: Message processed
 *       400:
 *         description: Invalid request parameters
 */

/**
 * @swagger
 * /api/eliza/status:
 *   get:
 *     summary: Check Eliza service status
 *     tags: [Eliza]
 *     responses:
 *       200:
 *         description: Eliza status
 */

/**
 * @swagger
 * /api/users/transactions/{username}:
 *   get:
 *     summary: Get comprehensive transaction history for a user
 *     description: Retrieves user's transaction history directly from the Hedera network using Hedera SDK
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *     responses:
 *       200:
 *         description: Transaction history successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/transaction/{transactionId}/{username}:
 *   get:
 *     summary: Get comprehensive details for a specific transaction
 *     description: Retrieves transaction details directly from the Hedera network using Hedera SDK
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedera transaction ID (format 0.0.12345@1234567890.123456789)
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *     responses:
 *       200:
 *         description: Transaction details successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/user/all-tokens/{username}:
 *   get:
 *     summary: Get all tokens for a user
 *     description: Retrieves all tokens associated with a user's account directly from Hedera network using Hedera SDK
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *           enum: [testnet, mainnet]
 *           default: testnet
 *         description: Network to fetch tokens from
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Number of tokens to return
 *       - in: query
 *         name: startingToken
 *         schema:
 *           type: string
 *         description: Token ID to start from for pagination
 *     responses:
 *       200:
 *         description: Tokens successfully retrieved
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/user/token/{tokenId}/{username}:
 *   get:
 *     summary: Get token details by ID
 *     description: Retrieves token details directly from Hedera network using Hedera SDK
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hedera token ID
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *           enum: [testnet, mainnet]
 *           default: testnet
 *         description: Network to fetch token from
 *     responses:
 *       200:
 *         description: Token details successfully retrieved
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Token not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/token-balances/{username}:
 *   get:
 *     summary: Get real-time token balances for a user
 *     description: Retrieves token balances directly from Hedera network using Hedera SDK, including HBAR and HTS tokens
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter username
 *     responses:
 *       200:
 *         description: Token balances successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 balances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TokenBalance'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// Set up Swagger
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));

export default router; 