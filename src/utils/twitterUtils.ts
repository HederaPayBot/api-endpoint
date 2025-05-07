import { Tweet } from '../services/types';

/**
 * Adapts various tweet formats to our common Tweet interface
 * @param tweet - The original tweet object
 * @returns A standardized Tweet object
 */
export const adaptTweet = (tweet: any): Tweet => {
  if (!tweet) return null;
  
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
  
  // Handle inReplyToStatus if present
  if (tweet.inReplyToStatus) {
    adapted.inReplyToStatus = adaptTweet(tweet.inReplyToStatus);
  }
  
  // Handle thread if present
  if (tweet.thread && Array.isArray(tweet.thread)) {
    adapted.thread = tweet.thread.map(t => adaptTweet(t));
  }
  
  // Handle quoted status if present
  if (tweet.quotedStatus) {
    adapted.quotedStatus = adaptTweet(tweet.quotedStatus);
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
  
  // First adapt the tweet to our format
  const adapted = adaptTweet(tweet);
  
  const safeClone: Tweet = { ...adapted };
  
  // Handle inReplyToStatus to avoid circular references
  if (safeClone.inReplyToStatus) {
    safeClone.inReplyToStatus = {
      id: safeClone.inReplyToStatus.id,
      text: safeClone.inReplyToStatus.text,
      username: safeClone.inReplyToStatus.username,
    } as Tweet;
  }
  
  // Process thread tweets if they exist
  if (safeClone.thread && Array.isArray(safeClone.thread)) {
    safeClone.thread = safeClone.thread.map(threadTweet => {
      const safeThreadTweet = { ...threadTweet };

      if (safeThreadTweet.inReplyToStatus) {
        if (safeThreadTweet.inReplyToStatus.id === adapted.id) {
          // If this thread tweet is referring to the parent tweet, simplify the reference
          safeThreadTweet.inReplyToStatus = {
            id: safeThreadTweet.inReplyToStatus.id,
            text: safeThreadTweet.inReplyToStatus.text,
            username: safeThreadTweet.inReplyToStatus.username,
          } as Tweet;
        } else {
          // Process other reply references recursively
          safeThreadTweet.inReplyToStatus = breakCircularReferences(
            safeThreadTweet.inReplyToStatus,
          );
        }
      }
      return safeThreadTweet;
    });
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