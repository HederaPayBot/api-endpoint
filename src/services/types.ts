export interface Tweet {
  id?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  profileImageUrl?: string;
  text?: string;
  timeParsed?: Date;
  hashtags?: any[];
  mentions?: any[];
  photos?: {
    url: string;
    width?: number;
    height?: number;
  }[];
  videos?: {
    url: string;
    duration?: number;
    variants?: any[];
  }[];
  urls?: {
    url: string;
    expandedUrl: string;
    displayUrl: string;
  }[];
  thread?: Tweet[];
  quotedStatus?: Tweet;
  conversationId?: string;
  inReplyToStatusId?: string;
  replyCount?: number;
  retweetCount?: number;
  likeCount?: number;
  viewCount?: number;
  id_str?: string;
  created_at?: string;
  full_text?: string;
  user?: {
    id_str?: string;
    screen_name?: string;
  };
  _parsedCreatedAt?: Date;
  inReplyToStatus?: Tweet;
}

export interface TwitterApi {
  scraper: any;
  username: string;
  userId: string;
  getMyUnrepliedToMentions: (maxResults: number, maxThreadDepth?: number, ignoreConversationIds?: string[], sinceId?: string, botUsername?: string) => Promise<Tweet[]>;
  getFollowingRecentTweets: (maxResults?: number, randomNumberOfUsers?: number) => Promise<Tweet[]>;
  isLoggedIn: () => Promise<boolean>;
  getProfile: (username: string) => Promise<any>;
  getMyProfile: () => Promise<any>;
  getTweet: (tweetId: string) => Promise<any>;
  getRecentTweets: (username: string, limit?: number) => Promise<any[]>;
  getMyRecentTweets: (limit?: number) => Promise<any[]>;
  getMyRepliedToIds: () => Promise<string[]>;
  getFollowing: (userId: string, limit?: number) => Promise<any[]>;
  getMyTimeline: (count: number, excludeIds: string[]) => Promise<Tweet[]>;
  getFollowingTimeline: (count: number, excludeIds: string[]) => Promise<Tweet[]>;
  getMyRecentReplies: (limit?: number) => Promise<Tweet[]>;
  sendTweet: (tweet: string, inReplyTo?: string) => Promise<string>;
  sendQuoteTweet?: (text: string, quotedTweetId: string) => Promise<any>;
  searchTweets?: (query: string, limit?: number, searchMode?: number) => AsyncGenerator<any> | Promise<Tweet[]>;
  getCookies?: () => Promise<any[]>;
  setCookies?: (cookies: string[]) => Promise<void>;
  quoteTweet?: (text: string, quotedTweetId: string) => Promise<string>;
  likeTweet?: (tweetId: string) => Promise<void>;
  followUser?: (username: string) => Promise<void>;
} 