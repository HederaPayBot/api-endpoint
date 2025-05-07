import { Scraper, SearchMode } from 'agent-twitter-client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { isValidTweet, convertTimelineTweetToTweet } from '../utils/convertFromTimeline';
import { adaptTweet, breakCircularReferences, tweetToMinimalTweet } from '../utils/twitterUtils';
import { Tweet, TwitterApi } from './types';

// Set up logging
const logPrefix = '[twitterApi]';
const logger = {
  info: (message: string, data?: any) => {
    console.log(`${logPrefix} INFO: ${message}`, data ? data : '');
  },
  error: (message: string, error?: any) => {
    console.error(`${logPrefix} ERROR: ${message}`, error ? error : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`${logPrefix} WARN: ${message}`, data ? data : '');
  }
};

const loadCookies = async (scraper: Scraper, cookiesPath: string): Promise<void> => {
  logger.info('Loading existing cookies');
  const cookies = readFileSync(cookiesPath, 'utf8');
  try {
    const parsedCookies = JSON.parse(cookies).map(
      (cookie: any) => `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`,
    );
    await scraper.setCookies(parsedCookies);
    logger.info('Loaded existing cookies from file');
  } catch (error) {
    logger.error('Error loading cookies:', error);
    throw error;
  }
};

const login = async (
  scraper: Scraper,
  username: string,
  password: string,
  email: string,
  twoFactorSecret: string,
  cookiesPath: string,
): Promise<void> => {
  logger.info('No existing cookies found or cookies expired, proceeding with login');
  await scraper.login(username, password, email, twoFactorSecret);

  const newCookies = await scraper.getCookies();
  writeFileSync(cookiesPath, JSON.stringify(newCookies, null, 2));
  logger.info('New cookies saved to file');
};

const iterateResponse = async <T>(response: AsyncGenerator<T>): Promise<T[]> => {
  const iterated: T[] = [];
  for await (const item of response) {
    iterated.push(item);
  }
  return iterated;
};

const getUserReplyIds = async (
  scraper: Scraper,
  username: string,
  maxRepliesToCheck = 100,
): Promise<Set<string>> => {
  const replyIdSet = new Set<string>();

  // Query: all recent tweets from the user that are replies to someone else
  const userRepliesIterator = scraper.searchTweets(
    `from:${username} @`, // "from: user" + "@" ensures it's a reply/mention
    maxRepliesToCheck,
    SearchMode.Latest,
  );

  for await (const reply of userRepliesIterator) {
    if (reply.inReplyToStatusId) {
      replyIdSet.add(reply.inReplyToStatusId);
    }
  }

  return replyIdSet;
};

const getMyRecentReplies = async (
  scraper: Scraper,
  username: string,
  maxResults: number = 10,
): Promise<Tweet[]> => {
  const userRepliesIterator = scraper.searchTweets(
    `from:${username} filter:replies`,
    maxResults,
    SearchMode.Latest,
  );
  const replies: any[] = [];
  try {
    for await (const reply of userRepliesIterator) {
      replies.push(reply);
    }
  } catch (error) {
    logger.error('Error fetching replies:', error);
  }
  
  // Use adaptTweet to properly convert the format
  return replies.map(reply => breakCircularReferences(reply));
};

const getReplyThread = (tweet: Tweet, conversation: Tweet[], maxThreadDepth: number = 5): Tweet[] => {
  const replyThread: Tweet[] = [];
  let currentTweet = tweet;
  
  // Limit thread depth to prevent excessive processing
  while (replyThread.length <= maxThreadDepth) {
    if (currentTweet.inReplyToStatusId) {
      const parentTweet = conversation.find(t => t.id === currentTweet.inReplyToStatusId);
      if (parentTweet) {
        replyThread.unshift(parentTweet);
        currentTweet = parentTweet;
      } else {
        break;
      }
    } else {
      if (!replyThread.some(t => t.id === currentTweet.id)) {
        replyThread.unshift(currentTweet);
      }
      break;
    }
  }

  logger.info(`Reply thread retrieved with ${replyThread.length} tweets`, { 
    tweetId: tweet.id
  });

  return replyThread;
};

const getMyUnrepliedToMentions = async (
  scraper: Scraper,
  username: string,
  maxThreadDepth: number = 5,
  ignoreConversationIds: string[] = [],
  maxResults: number = 50,
  sinceId?: string,
  botUsername?: string,
): Promise<Tweet[]> => {
  // Use botUsername for search query if provided
  logger.info(`Bot username: ${botUsername}`);
  const queryUsername = botUsername || "HederaPayBot";
  
  logger.info(`Getting mentions for @${queryUsername}`, { 
    maxResults, 
    sinceId: sinceId || 'none',
    maxThreadDepth,
    ignoreConversations: ignoreConversationIds.length
  });

  // Build query to exclude specific conversations if needed
  const queryConversationIds = ignoreConversationIds.length > 0 
    ? ignoreConversationIds.map(id => ` -conversation_id:${id}`).join('') 
    : '';
  
  // Use botUsername for the search query, not the authenticated username
  const query = `@${queryUsername} ${queryConversationIds}`;
  console.log(`Query: ${query}`);
  const mentionIterator = scraper.searchTweets(query, maxResults, SearchMode.Latest);

  // Build a set of "already replied to" tweet IDs in one query
  const repliedToIds = await getUserReplyIds(scraper, username, 100);

  // Filter out any mention we've already replied to
  const newMentions: any[] = [];
  const conversations = new Map<string, any[]>();
  
  for await (const tweet of mentionIterator) {
    // Skip tweets without an ID
    if (!tweet.id) continue;
    logger.info(`Tweet: ${JSON.stringify(tweet)}`);
    // Skip tweets from ignored conversations
    if (tweet.conversationId && ignoreConversationIds.includes(tweet.conversationId)) continue;

    // Stop if we've reached or passed the sinceId
    if (sinceId && tweet.id <= sinceId) {
      break;
    }

    // Skip if user has already replied
    if (repliedToIds.has(tweet.id)) {
      logger.info(`Skipping tweet ${tweet.id} (already replied)`);
      continue;
    }
    
    newMentions.push(tweet);

    // Skip tweets without conversation ID
    if (!tweet.conversationId) continue;

    if (!conversations.has(tweet.conversationId)) {
      const conversation = await iterateResponse(
        scraper.searchTweets(`conversation_id:${tweet.conversationId}`, 100, SearchMode.Latest),
      );

      const initialTweet = await scraper.getTweet(tweet.conversationId);
      if (initialTweet) {
        conversation.push(initialTweet);
      }
      conversations.set(tweet.conversationId, conversation);
    }

    // Stop if we already have enough
    if (newMentions.length >= maxResults) {
      break;
    }
  }

  const withThreads = newMentions.map(mention => {
    // Skip mentions without conversation ID
    if (!mention.conversationId) return mention;

    const conversation = conversations.get(mention.conversationId);
    if (!conversation) return mention;

    const thread = getReplyThread(mention, conversation, maxThreadDepth);
    return {
      ...mention,
      thread,
    };
  });

  // Process the tweets to break circular references and ensure type compatibility
  return withThreads.map(tweet => breakCircularReferences(tweet));
};

const getFollowingRecentTweets = async (
  scraper: Scraper,
  username: string,
  maxResults: number = 50,
  randomNumberOfUsers: number = 10,
): Promise<Tweet[]> => {
  logger.info('Getting following recent tweets', {
    username,
    maxResults,
    randomNumberOfUsers,
  });
  
  const userId = await scraper.getUserIdByScreenName(username);
  const following = await iterateResponse(scraper.getFollowing(userId, 100));
  
  // Randomly select a subset of following users
  const randomFollowing = [...following]
    .sort(() => 0.5 - Math.random())
    .slice(0, randomNumberOfUsers);

  logger.info(`Selected ${randomFollowing.length} random users to get tweets from`);

  const query = `(${randomFollowing.map(user => `from:${user.username}`).join(' OR ')})`;
  const tweets = await iterateResponse(scraper.searchTweets(query, maxResults, SearchMode.Latest));
  
  // Process tweets to match our interface
  return tweets.map(tweet => breakCircularReferences(tweet));
};

/**
 * Find the ID of a tweet that was just sent by repeatedly checking recent tweets
 * @param scraper - Twitter scraper instance
 * @param tweetText - Text of the tweet to find
 * @param username - Username who sent the tweet
 * @returns The tweet ID if found, empty string otherwise
 */
const findTweetId = async (scraper: Scraper, tweetText: string, username: string): Promise<string> => {
  // Use exponential backoff to retry finding the tweet
  const maxRetries = 4;
  const baseDelay = 500;

  for (let i = 0; i < maxRetries; i++) {
    const delay = baseDelay * Math.pow(2, i);
    // Wait before checking to give Twitter time to process
    await new Promise(resolve => setTimeout(resolve, delay));

    const recentTweets = await iterateResponse(
      scraper.searchTweets(`from:${username}`, 5, SearchMode.Latest),
    );

    const sentTweet = recentTweets.find(tweet => tweet.text?.includes(tweetText));
    if (sentTweet?.id) {
      logger.info(`Tweet ID confirmed on attempt ${i+1}`, { id: sentTweet.id });
      return sentTweet.id;
    }
    
    logger.info(`Tweet ID not found on attempt ${i+1}, retrying after ${delay*2}ms`);
  }
  
  logger.warn('Tweet ID could not be confirmed after all retries', { tweetText });
  return '';
};

export const createTwitterApi = async (
  username: string,
  password: string,
  email: string,
  twoFactorSecret: string = '',
  cookiesPath: string = 'cookies.json'
): Promise<TwitterApi> => {
  const scraper = new Scraper();

  // Initialize authentication
  if (existsSync(cookiesPath)) {
    try {
      await loadCookies(scraper, cookiesPath);
    } catch (error) {
      logger.error('Error loading cookies, will try to login', error);
      await login(scraper, username, password, email, twoFactorSecret, cookiesPath);
    }
  } else {
    await login(scraper, username, password, email, twoFactorSecret, cookiesPath);
  }

  const isLoggedIn = await scraper.isLoggedIn();
  logger.info(`Login status: ${isLoggedIn}`);

  if (!isLoggedIn) {
    logger.info(`Previous cookies expired or invalid, logging in again`);
    try {
      await login(scraper, username, password, email, twoFactorSecret, cookiesPath);
      const isSecondLoginSuccessful = await scraper.isLoggedIn();
      logger.info(`Second login attempt status: ${isSecondLoginSuccessful}`);
      if (!isSecondLoginSuccessful) {
        throw new Error('Failed to initialize Twitter Api - not logged in');
      }
    } catch (error) {
      throw new Error(`Failed to initialize Twitter Api: ${error.message}`);
    }
  }

  const userId = await scraper.getUserIdByScreenName(username);
  
  // Helper function to clean timeline tweets
  const cleanTimelineTweets = (tweets: unknown[], count: number) => {
    const cleanedTweets = tweets
      .filter(isValidTweet)
      .map(tweet => convertTimelineTweetToTweet(tweet))
      .map(tweet => breakCircularReferences(tweet)); 

    // Randomly trim if we have too many tweets
    return cleanedTweets.length > count
      ? cleanedTweets.sort(() => Math.random() - 0.5).slice(0, count)
      : cleanedTweets;
  };

  return {
    scraper,
    username: username,
    userId: userId,
    
    getMyUnrepliedToMentions: (maxResults: number, maxThreadDepth: number = 5, ignoreConversationIds: string[] = [], sinceId?: string, botUsername?: string) =>
      getMyUnrepliedToMentions(scraper, username, maxThreadDepth, ignoreConversationIds, maxResults, sinceId, botUsername),

    getFollowingRecentTweets: (maxResults: number = 100, randomNumberOfUsers: number = 10) =>
      getFollowingRecentTweets(scraper, username, maxResults, randomNumberOfUsers),

    isLoggedIn: () => scraper.isLoggedIn(),

    getProfile: async (username: string) => {
      const profile = await scraper.getProfile(username);
      if (!profile) {
        throw new Error(`Profile not found: ${username}`);
      }
      return profile;
    },

    getMyProfile: async () => await scraper.getProfile(username),

    getTweet: async (tweetId: string) => {
      const tweet = await scraper.getTweet(tweetId);
      return tweet ? breakCircularReferences(tweet) : null;
    },

    getRecentTweets: async (username: string, limit: number = 100) => {
      const userId = await scraper.getUserIdByScreenName(username);
      const tweets = await iterateResponse(scraper.getTweetsByUserId(userId, limit));
      return tweets.map(tweet => breakCircularReferences(tweet));
    },

    getMyRecentTweets: async (limit: number = 10) => {
      const tweets = await iterateResponse(
        scraper.getTweetsByUserId(await scraper.getUserIdByScreenName(username), limit),
      );
      return tweets.map(tweet => breakCircularReferences(tweet));
    },

    getMyRepliedToIds: async () => Array.from(await getUserReplyIds(scraper, username, 100)),

    getFollowing: async (username: string, limit: number = 100) => {
      const userId = await scraper.getUserIdByScreenName(username);
      return await iterateResponse(scraper.getFollowing(userId, limit));
    },

    getMyTimeline: async (count: number, excludeIds: string[]) => {
      const tweets = await scraper.fetchHomeTimeline(count, excludeIds);
      return cleanTimelineTweets(tweets, count);
    },

    getFollowingTimeline: async (count: number, excludeIds: string[]) => {
      const tweets = await scraper.fetchFollowingTimeline(count, excludeIds);
      return cleanTimelineTweets(tweets, count);
    },

    getMyRecentReplies: (limit: number = 10) => {
      const replies = getMyRecentReplies(scraper, username, limit);
      return replies.then(tweets => tweets.map(tweet => breakCircularReferences(tweet)));
    },

    // Enhanced sendTweet that returns the tweet ID
    sendTweet: async (text: string, inReplyTo?: string) => {
      try {
        if (text.length > 280) {
          await scraper.sendLongTweet(text, inReplyTo);
        } else {
          await scraper.sendTweet(text, inReplyTo);
        }
        logger.info('Tweet sent', { tweetLength: text.length, inReplyTo });
        
        // Try to get the tweet ID
        const tweetId = await findTweetId(scraper, text, username);
        return tweetId;
      } catch (error) {
        logger.error('Error sending tweet', error);
        throw error;
      }
    },

    // Direct access to searchTweets method
    searchTweets: async (query: string, limit: number = 25) => {
      const tweets = await iterateResponse(scraper.searchTweets(query, limit, SearchMode.Latest));
      return tweets.map(tweet => breakCircularReferences(tweet));
    },
      
    // Quote tweet functionality with ID return
    quoteTweet: async (text: string, quotedTweetId: string) => {
      try {
        await scraper.sendQuoteTweet(text, quotedTweetId);
        logger.info('Quote tweet sent', { tweetLength: text.length, quotedTweetId });
        
        // Try to get the tweet ID
        const tweetId = await findTweetId(scraper, text, username);
        return tweetId;
      } catch (error) {
        logger.error('Error sending quote tweet', error);
        throw error;
      }
    },
    
    // For backwards compatibility
    sendQuoteTweet: async (text: string, quotedTweetId: string) => {
      return await scraper.sendQuoteTweet(text, quotedTweetId);
    },
    
    // Additional methods for enhanced functionality
    likeTweet: async (tweetId: string) => {
      await scraper.likeTweet(tweetId);
      logger.info('Tweet liked', { tweetId });
    },
    
    followUser: async (username: string) => {
      await scraper.followUser(username);
      logger.info('User followed', { username });
    },
    
    // Direct cookie access methods
    getCookies: async () => await scraper.getCookies(),
    setCookies: async (cookies: string[]) => await scraper.setCookies(cookies),
  };
}; 