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
          required: ['twitterUsername', 'twitterId'],
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
            },
            hederaPrivateKey: {
              type: 'string',
              description: 'Hedera private key'
            },
            hederaPublicKey: {
              type: 'string',
              description: 'Hedera public key'
            },
            hederaNetworkType: {
              type: 'string',
              description: 'Hedera network type (testnet, mainnet)',
              default: 'testnet'
            },
            hederaKeyType: {
              type: 'string',
              description: 'Hedera key type',
              default: 'ED25519'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            twitterUsername: {
              type: 'string',
              description: 'Twitter username'
            },
            twitterId: {
              type: 'string',
              description: 'Twitter ID'
            },
            registeredAt: {
              type: 'string',
              format: 'date-time',
              description: 'Registration timestamp'
            },
            hederaAccounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accountId: {
                    type: 'string',
                    description: 'Hedera account ID'
                  },
                  isPrimary: {
                    type: 'boolean',
                    description: 'Whether this is the primary account'
                  },
                  linkedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'When the account was linked'
                  }
                }
              }
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
            transactionId: {
              type: 'string',
              description: 'Hedera transaction ID'
            },
            type: {
              type: 'string',
              description: 'Type of transaction (TRANSFER, CRYPTOTRANSFER, etc.)'
            },
            amount: {
              type: 'string',
              description: 'Transaction amount'
            },
            tokenId: {
              type: 'string',
              description: 'Token ID (HBAR for cryptocurrency transfers)'
            },
            timestamp: {
              type: 'string',
              description: 'Transaction timestamp'
            },
            senderUsername: {
              type: 'string',
              description: 'Twitter username of sender'
            },
            recipientUsername: {
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
            networkType: {
              type: 'string',
              description: 'Hedera network type (testnet, mainnet)'
            },
            source: {
              type: 'string',
              description: 'Data source (local_db or mirror_node)'
            },
            hashscanUrl: {
              type: 'string',
              description: 'URL to view transaction on Hashscan'
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
        Token: {
          type: 'object',
          properties: {
            tokenId: {
              type: 'string',
              description: 'Token ID'
            },
            name: {
              type: 'string',
              description: 'Token name'
            },
            symbol: {
              type: 'string',
              description: 'Token symbol'
            },
            decimals: {
              type: 'number',
              description: 'Token decimal places'
            },
            totalSupply: {
              type: 'string',
              description: 'Total supply of the token'
            },
            treasury: {
              type: 'object',
              description: 'Treasury account information'
            },
            customFees: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Custom fees associated with the token'
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
        },
        ReadinessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ready'
            },
            database: {
              type: 'string',
              example: 'available'
            },
            hedera: {
              type: 'string',
              example: 'configured'
            }
          }
        },
        BalanceQueryResponse: {
          type: 'object',
          properties: {
            isBalanceQuery: {
              type: 'boolean',
              example: true
            },
            type: {
              type: 'string',
              example: 'HBAR'
            },
            tokenId: {
              type: 'string',
              example: '0.0.12345'
            },
            response: {
              type: 'string',
              example: 'Your HBAR balance is 10.5'
            }
          }
        },
        ElizaStatusResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            available: {
              type: 'boolean',
              example: true
            },
            url: {
              type: 'string',
              example: 'http://localhost:3000'
            },
            agent: {
              type: 'string',
              example: 'Hedera Helper'
            },
            details: {
              type: 'object',
              description: 'Additional status details from Eliza'
            }
          }
        },
        LinkStatusResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            linked: {
              type: 'boolean',
              example: true
            },
            hederaAccount: {
              type: 'string',
              example: '0.0.12345'
            }
          }
        },
        AutoAccountCreationRequest: {
          type: 'object',
          properties: {
            twitterUsername: {
              type: 'string',
              description: 'Twitter username'
            },
            initialBalance: {
              type: 'number',
              description: 'Initial HBAR balance to fund the account with',
              default: 1
            }
          },
          required: ['twitterUsername']
        },
        AutoAccountCreationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Successfully created Hedera account 0.0.12345 for @username and funded with 10 HBAR'
            },
            accountId: {
              type: 'string',
              example: '0.0.12345'
            },
            transactionId: {
              type: 'string',
              example: '0.0.12345@1624123456.789012345'
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
        name: 'Eliza',
        description: 'Eliza agent endpoints'
      },
      {
        name: 'Tokens',
        description: 'Token management endpoints'
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
 * /api/health/ready:
 *   get:
 *     summary: Check if the API is ready to accept requests
 *     tags: [Health]
 *     description: Confirms that all dependencies (database, Hedera, etc.) are available
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadinessResponse'
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: not ready
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user with automatic Hedera account creation
 *     tags: [Users]
 *     description: Creates a new user and automatically generates a Hedera account for them
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Twitter username
 *               initialBalance:
 *                 type: number
 *                 description: Initial HBAR balance for the new account
 *                 default: 10
 *     responses:
 *       200:
 *         description: User registered and Hedera account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hedera account 0.0.12345 created for @username. Check details: https://hashscan.io/testnet/tx/0.0.12345@1624123456.789012345
 *                 accountId:
 *                   type: string
 *                   example: 0.0.12345
 *                 transactionId:
 *                   type: string
 *                   example: 0.0.12345@1624123456.789012345
 *       400:
 *         description: Invalid request parameters or user already has an account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
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
 *         description: User profile successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [twitterUsername]
 *             properties:
 *               twitterUsername:
 *                 type: string
 *                 description: Twitter username
 *               hederaAccountId:
 *                 type: string
 *                 description: Hedera account ID to link
 *               makeDefault:
 *                 type: boolean
 *                 description: Whether to make the new account the default
 *                 default: false
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hedera account 0.0.12345 linked to @username
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
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
 *         description: Link status successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LinkStatusResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/link-hedera-account:
 *   post:
 *     summary: Link a Twitter user to a Hedera account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, hederaAccountId, privateKey, publicKey, networkType, keyType]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Twitter username
 *               hederaAccountId:
 *                 type: string
 *                 description: Hedera account ID
 *               privateKey:
 *                 type: string
 *                 description: Hedera private key
 *               publicKey:
 *                 type: string
 *                 description: Hedera public key
 *               networkType:
 *                 type: string
 *                 description: Hedera network type (testnet, mainnet)
 *               keyType:
 *                 type: string
 *                 description: Hedera key type (e.g., ED25519)
 *     responses:
 *       200:
 *         description: Account linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hedera account 0.0.12345 linked to @username
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 processed:
 *                   type: integer
 *                   example: 5
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       error:
 *                         type: string
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/twitter/poll-mentions/force:
 *   get:
 *     summary: Force polling for Twitter mentions including those that might not have commands
 *     tags: [Twitter]
 *     responses:
 *       200:
 *         description: Forced polling triggered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 processed:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Internal server error
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mentions:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Endpoint disabled in production
 *       500:
 *         description: Internal server error
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
 *             type: object
 *             required: [tweet_id, text]
 *             properties:
 *               tweet_id:
 *                 type: string
 *                 description: ID of the tweet to reply to
 *               text:
 *                 type: string
 *                 description: Text content of the reply
 *     responses:
 *       200:
 *         description: Reply sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   description: Result of the Twitter API call
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Endpoint disabled in production
 *       500:
 *         description: Internal server error
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
 *             type: object
 *             required: [command]
 *             properties:
 *               command:
 *                 type: string
 *                 description: Command to process
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 default: test_id
 *               userName:
 *                 type: string
 *                 description: Username
 *                 default: test_user
 *     responses:
 *       200:
 *         description: Command processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 parsedCommand:
 *                   type: object
 *                   description: Parsed command structure
 *                 result:
 *                   type: object
 *                   description: Result from Eliza
 *                 response:
 *                   type: string
 *                   description: Response message for registration commands
 *                 accountId:
 *                   type: string
 *                   description: Account ID for registration commands
 *                 transactionId:
 *                   type: string
 *                   description: Transaction ID for registration commands
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/twitter/test-balance:
 *   post:
 *     summary: Test balance query detection and response
 *     tags: [Twitter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze for balance query
 *               userId:
 *                 type: string
 *                 description: Optional user ID to generate response
 *     responses:
 *       200:
 *         description: Balance query analyzed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceQueryResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
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
 *             $ref: '#/components/schemas/AutoAccountCreationRequest'
 *     responses:
 *       200:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutoAccountCreationResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/twitter/command:
 *   post:
 *     summary: Send a command to Eliza from a web/mobile client
 *     tags: [Twitter]
 *     description: Allows logged-in web/mobile users to interact with Eliza
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command, userName]
 *             properties:
 *               command:
 *                 type: string
 *                 description: Command text
 *               userName:
 *                 type: string
 *                 description: Twitter username
 *     responses:
 *       200:
 *         description: Command processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 elizaResponse:
 *                   type: object
 *                   description: Response from Eliza
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/twitter/force-reprocess:
 *   post:
 *     summary: Force reprocessing of tweets
 *     tags: [Twitter]
 *     description: Force the system to reprocess specific tweets or all recent tweets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tweetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific tweet IDs to reprocess
 *               all:
 *                 type: boolean
 *                 description: Set to true to reprocess all recent tweets
 *     responses:
 *       200:
 *         description: Reprocessing triggered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       wasProcessed:
 *                         type: boolean
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Endpoint disabled in production
 *       500:
 *         description: Internal server error
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ElizaStatusResponse'
 *       500:
 *         description: Internal server error
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
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: User not found or no linked Hedera account
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
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/tokens/{username}:
 *   get:
 *     summary: Get all tokens for a user
 *     description: Retrieves all token balances for a user from Eliza
 *     tags: [Tokens]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tokens:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tokenId:
 *                         type: string
 *                         example: 0.0.12345
 *                       name:
 *                         type: string
 *                         example: GameGold
 *                       symbol:
 *                         type: string
 *                         example: GG
 *                       decimals:
 *                         type: integer
 *                         example: 2
 *                       balance:
 *                         type: string
 *                         example: 750000
 *                       rawBalance:
 *                         type: string
 *                         example: 75000000
 *                 totalTokens:
 *                   type: integer
 *                   example: 6
 *                 accountId:
 *                   type: string
 *                   example: 0.0.5864628
 *                 network:
 *                   type: string
 *                   example: testnet
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/token/{tokenId}/{username}:
 *   get:
 *     summary: Get token details by ID
 *     description: Retrieves token details directly from Eliza
 *     tags: [Tokens]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: object
 *                   properties:
 *                     tokenId:
 *                       type: string
 *                       example: 0.0.5900732
 *                     name:
 *                       type: string
 *                       example: GameGold
 *                     symbol:
 *                       type: string
 *                       example: GG
 *                     decimals:
 *                       type: integer
 *                       example: 2
 *                     balance:
 *                       type: string
 *                       example: 750000
 *                     rawBalance:
 *                       type: string
 *                       example: 75000000
 *                     accountId:
 *                       type: string
 *                       example: 0.0.5864628
 *                     network:
 *                       type: string
 *                       example: testnet
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Token not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/hbar-balance/{username}:
 *   get:
 *     summary: Get user's HBAR balance
 *     description: Retrieves a user's HBAR balance from their Hedera account using Eliza
 *     tags: [Tokens]
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
 *         description: Network to fetch balance from
 *     responses:
 *       200:
 *         description: HBAR balance successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accountId:
 *                   type: string
 *                   example: 0.0.12345
 *                 hbarBalance:
 *                   type: string
 *                   example: 100.5
 *                 network:
 *                   type: string
 *                   example: testnet
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: User not found or has no linked Hedera account
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/tokens/{username}:
 *   get:
 *     summary: Get all tokens for a user
 *     description: Retrieves all token balances for a user from Eliza
 *     tags: [Tokens]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tokens:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tokenId:
 *                         type: string
 *                         example: 0.0.12345
 *                       name:
 *                         type: string
 *                         example: GameGold
 *                       symbol:
 *                         type: string
 *                         example: GG
 *                       decimals:
 *                         type: integer
 *                         example: 2
 *                       balance:
 *                         type: string
 *                         example: 750000
 *                       rawBalance:
 *                         type: string
 *                         example: 75000000
 *                 totalTokens:
 *                   type: integer
 *                   example: 6
 *                 accountId:
 *                   type: string
 *                   example: 0.0.5864628
 *                 network:
 *                   type: string
 *                   example: testnet
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/token/{tokenId}/{username}:
 *   get:
 *     summary: Get token details by ID
 *     description: Retrieves token details directly from Eliza
 *     tags: [Tokens]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: object
 *                   properties:
 *                     tokenId:
 *                       type: string
 *                       example: 0.0.5900732
 *                     name:
 *                       type: string
 *                       example: GameGold
 *                     symbol:
 *                       type: string
 *                       example: GG
 *                     decimals:
 *                       type: integer
 *                       example: 2
 *                     balance:
 *                       type: string
 *                       example: 750000
 *                     rawBalance:
 *                       type: string
 *                       example: 75000000
 *                     accountId:
 *                       type: string
 *                       example: 0.0.5864628
 *                     network:
 *                       type: string
 *                       example: testnet
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Token not found
 *       500:
 *         description: Internal server error
 */

// Set up Swagger
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));

export default router; 