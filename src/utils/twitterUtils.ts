import { Tweet } from '../services/types';

/**
 * Adapts various tweet formats to our common Tweet interface
 * @param tweet - The original tweet object
 * @param depth - Current recursion depth to prevent infinite recursion
 * @returns A standardized Tweet object
 */
export const adaptTweet = (tweet: any, depth: number = 0): Tweet => {
  // Return null for null tweets or if we've gone too deep
  if (!tweet || depth > 3) return null;
  
  // Create a base tweet object with our structure
  const adapted: Tweet = {
    id: tweet.id || tweet.id_str,
    text: tweet.text || tweet.full_text || '',
    username: tweet.username || (tweet.user ? tweet.user.screen_name : null),
    displayName: tweet.displayName || (tweet.user ? tweet.user.name : null),
    userId: tweet.userId || tweet.user_id_str || (tweet.user ? tweet.user.id_str : null),
    timeParsed: tweet.timeParsed || (tweet.created_at ? new Date(tweet.created_at) : null),
    inReplyToStatusId: tweet.inReplyToStatusId || tweet.in_reply_to_status_id_str,
    conversationId: tweet.conversationId || tweet.conversation_id_str,
  };
  
  // Handle URLs properly
  if (tweet.urls) {
    // Twitter client might return URLs as string array 
    if (Array.isArray(tweet.urls) && typeof tweet.urls[0] === 'string') {
      adapted.urls = tweet.urls.map(url => ({
        url: url,
        expandedUrl: url,
        displayUrl: url
      }));
    } else {
      // Otherwise assume correct format or empty array
      adapted.urls = tweet.urls;
    }
  }
  
  // Copy other fields if present
  if (tweet.hashtags) adapted.hashtags = tweet.hashtags;
  if (tweet.mentions) adapted.mentions = tweet.mentions;
  if (tweet.photos) adapted.photos = tweet.photos;
  if (tweet.videos) adapted.videos = tweet.videos;
  if (tweet.replyCount) adapted.replyCount = tweet.replyCount;
  if (tweet.retweetCount) adapted.retweetCount = tweet.retweetCount;
  if (tweet.likeCount) adapted.likeCount = tweet.likeCount;
  if (tweet.viewCount) adapted.viewCount = tweet.viewCount;
  
  // Only process nested tweets if we're not too deep
  if (depth < 3) {
    // Handle inReplyToStatus if present
    if (tweet.inReplyToStatus) {
      // Make sure we're not creating a circular reference
      if (tweet.inReplyToStatus.id !== tweet.id) {
        adapted.inReplyToStatus = adaptTweet(tweet.inReplyToStatus, depth + 1);
      }
    }
    
    // Handle thread if present
    if (tweet.thread && Array.isArray(tweet.thread)) {
      adapted.thread = tweet.thread.map(t => {
        // Skip circular references in thread
        if (t.id === tweet.id) return null;
        return adaptTweet(t, depth + 1);
      }).filter(Boolean); // Remove null entries
    }
    
    // Handle quoted status if present
    if (tweet.quotedStatus) {
      // Make sure we're not creating a circular reference
      if (tweet.quotedStatus.id !== tweet.id) {
        adapted.quotedStatus = adaptTweet(tweet.quotedStatus, depth + 1);
      }
    }
  }
  
  return adapted;
};

/**
 * Breaks circular references in Tweet objects for safe serialization and processing
 * @param tweet - The tweet to process
 * @returns A new tweet object with circular references broken
 */
export const breakCircularReferences = (tweet: any): Tweet => {
  if (!tweet) return null;
  
  // Just work with the tweet directly, don't call adaptTweet again
  // which could cause infinite recursion
  const safeClone: Tweet = { 
    id: tweet.id || tweet.id_str,
    text: tweet.text || tweet.full_text || '',
    username: tweet.username || (tweet.user ? tweet.user.screen_name : null),
    displayName: tweet.displayName || (tweet.user ? tweet.user.name : null),
    userId: tweet.userId || tweet.user_id_str || (tweet.user ? tweet.user.id_str : null),
    timeParsed: tweet.timeParsed || (tweet.created_at ? new Date(tweet.created_at) : null),
    inReplyToStatusId: tweet.inReplyToStatusId || tweet.in_reply_to_status_id_str,
    conversationId: tweet.conversationId || tweet.conversation_id_str,
  };
  
  // Copy non-nested properties
  if (tweet.urls) safeClone.urls = tweet.urls;
  if (tweet.hashtags) safeClone.hashtags = tweet.hashtags;
  if (tweet.mentions) safeClone.mentions = tweet.mentions;
  if (tweet.photos) safeClone.photos = tweet.photos;
  if (tweet.videos) safeClone.videos = tweet.videos;
  if (tweet.replyCount) safeClone.replyCount = tweet.replyCount;
  if (tweet.retweetCount) safeClone.retweetCount = tweet.retweetCount;
  if (tweet.likeCount) safeClone.likeCount = tweet.likeCount;
  if (tweet.viewCount) safeClone.viewCount = tweet.viewCount;
  
  // Handle inReplyToStatus to avoid circular references
  if (tweet.inReplyToStatus) {
    // Create a minimal reference instead of the full object
    safeClone.inReplyToStatus = {
      id: tweet.inReplyToStatus.id || tweet.inReplyToStatus.id_str,
      text: tweet.inReplyToStatus.text || tweet.inReplyToStatus.full_text || '',
      username: tweet.inReplyToStatus.username || 
                (tweet.inReplyToStatus.user ? tweet.inReplyToStatus.user.screen_name : null),
    } as Tweet;
  }
  
  // Process thread tweets if they exist, but keep them minimal
  if (tweet.thread && Array.isArray(tweet.thread)) {
    safeClone.thread = tweet.thread.map(threadTweet => {
      return {
        id: threadTweet.id || threadTweet.id_str,
        text: threadTweet.text || threadTweet.full_text || '',
        username: threadTweet.username || 
                 (threadTweet.user ? threadTweet.user.screen_name : null),
        timeParsed: threadTweet.timeParsed || 
                   (threadTweet.created_at ? new Date(threadTweet.created_at) : null),
        inReplyToStatusId: threadTweet.inReplyToStatusId || threadTweet.in_reply_to_status_id_str,
      } as Tweet;
    });
  }
  
  // Handle quoted status similar to inReplyToStatus
  if (tweet.quotedStatus) {
    safeClone.quotedStatus = {
      id: tweet.quotedStatus.id || tweet.quotedStatus.id_str,
      text: tweet.quotedStatus.text || tweet.quotedStatus.full_text || '',
      username: tweet.quotedStatus.username || 
               (tweet.quotedStatus.user ? tweet.quotedStatus.user.screen_name : null),
    } as Tweet;
  }
  
  return safeClone;
};

/**
 * Creates a minimal representation of a tweet for more efficient processing
 * @param tweet - The full tweet object
 * @returns A minimal tweet with only essential properties
 */
export const tweetToMinimalTweet = (tweet: Tweet): Partial<Tweet> => {
  if (!tweet) return {};
  
  // Extract just the essential properties
  return {
    id: tweet.id,
    text: tweet.text,
    username: tweet.username,
    displayName: tweet.displayName,
    profileImageUrl: tweet.profileImageUrl,
    userId: tweet.userId,
    timeParsed: tweet.timeParsed,
    conversationId: tweet.conversationId,
    inReplyToStatusId: tweet.inReplyToStatusId,
    // Simplified thread if it exists
    ...(tweet.thread && { 
      thread: tweet.thread.map(t => ({
        id: t.id,
        text: t.text,
        username: t.username,
        timeParsed: t.timeParsed,
        inReplyToStatusId: t.inReplyToStatusId,
      }))
    }),
  };
};

/**
 * Combines breakCircularReferences and tweetToMinimalTweet for clean processing
 * @param tweet - The tweet to process
 * @returns A clean minimal tweet without circular references
 */
export const cleanTweetForCircularReferences = (tweet: any): Tweet => {
  return breakCircularReferences(tweet);
}; 