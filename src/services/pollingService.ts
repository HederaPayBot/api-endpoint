import axios from 'axios';

/**
 * Service to periodically poll for Twitter mentions and process them
 */
let pollingInterval: NodeJS.Timeout | null = null;
let retryTimeout: NodeJS.Timeout | null = null;
const POLL_INTERVAL_MS = 60000; // Default to 1 minute
const MAX_BACKOFF_MS = 15 * 60 * 1000; // Max 15 minutes backoff
let currentBackoffMs = 0;
let consecutiveErrors = 0;
let lastPollTime = 0;

/**
 * Start the polling service
 * @param intervalMs Polling interval in milliseconds
 */
export function startPollingService(intervalMs = POLL_INTERVAL_MS): void {
  // Clear any existing interval first
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  
  console.log(`Starting Twitter polling service with interval of ${intervalMs}ms`);
  lastPollTime = Date.now();
  
  // Schedule the first poll immediately
  pollForMentions();
  
  // Set up the polling interval
  pollingInterval = setInterval(() => {
    // Check if we're in backoff mode
    if (currentBackoffMs > 0) {
      console.log(`Skipping poll due to backoff (${currentBackoffMs}ms remaining)`);
      return;
    }
    
    // Check if it's been too long since the last successful poll
    const timeSinceLastPoll = Date.now() - lastPollTime;
    if (timeSinceLastPoll > intervalMs * 3) {
      console.warn(`Last poll was ${timeSinceLastPoll}ms ago. Resetting polling service...`);
      stopPollingService();
      startPollingService(intervalMs);
      return;
    }
    
    pollForMentions();
  }, intervalMs);
}

/**
 * Poll for mentions using the API
 */
async function pollForMentions(): Promise<void> {
  try {
    console.log(`Polling for mentions at ${new Date().toISOString()}`);
    
    // Call our local API endpoint to process mentions
    const response = await axios.get('http://localhost:' + (process.env.PORT || '5001') + '/api/twitter/poll-mentions', {
      // Add a timeout to prevent hanging requests
      timeout: 30000,
      // Add a parameter to help debug 
      params: {
        source: 'poll_service',
        timestamp: Date.now()
      }
    });
    
    const { processed, errors } = response.data;
    
    lastPollTime = Date.now();
    consecutiveErrors = 0;
    currentBackoffMs = 0; // Reset backoff on successful poll
    
    if (processed > 0) {
      console.log(`Poll completed: processed ${processed} new mentions`);
    } else {
      console.log('Poll completed: no new mentions to process');
    }
    
    if (errors && errors.length > 0) {
      console.error(`Poll encountered ${errors.length} errors:`, errors);
    }
  } catch (error) {
    consecutiveErrors++;
    
    // Improved error logging with more details
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = error.message || 'Unknown error';
    
    console.error(`Error polling for Twitter mentions (attempt #${consecutiveErrors}):`, {
      status: statusCode,
      message: errorMessage,
      data: errorData || {},
      stack: error.stack?.split('\n')[0] // First line of stack trace
    });
    
    // More robust rate limit detection
    const isRateLimited = 
      // HTTP 429 Too Many Requests
      statusCode === 429 || 
      // Twitter API rate limit error
      (errorData && (
        errorData.error === 'Rate limit exceeded' || 
        errorData.errors?.some((e: any) => e.code === 88 || e.message?.includes('rate limit'))
      )) ||
      // Error message mentions rate limit
      errorMessage.toLowerCase().includes('rate limit');
    
    if (isRateLimited) {
      console.warn('Twitter API rate limit detected');
      applyRateLimitBackoff();
    } 
    // Connection errors
    else if (
      errorMessage.includes('ECONNREFUSED') || 
      errorMessage.includes('ETIMEDOUT') || 
      errorMessage.includes('network') ||
      errorMessage.includes('socket')
    ) {
      console.warn('Network connection error detected');
      // Apply a fixed 30 second backoff for connection issues
      currentBackoffMs = 30 * 1000;
      scheduleRetry();
    }
    // Other errors with multiple consecutive failures
    else if (consecutiveErrors >= 5) {
      console.warn(`${consecutiveErrors} consecutive errors, applying backoff...`);
      currentBackoffMs = Math.min(currentBackoffMs + (30 * 1000), MAX_BACKOFF_MS);
      scheduleRetry();
    }
  }
}

/**
 * Apply rate limit backoff with exponential increase
 */
function applyRateLimitBackoff(): void {
  // Exponential backoff: 1min, 2min, 4min, 8min, up to MAX_BACKOFF_MS
  if (currentBackoffMs === 0) {
    currentBackoffMs = 60 * 1000; // Start with 1 minute
  } else {
    currentBackoffMs = Math.min(currentBackoffMs * 2, MAX_BACKOFF_MS);
  }
  
  console.warn(`Twitter API rate limit hit, backing off for ${currentBackoffMs / 1000} seconds`);
  scheduleRetry();
}

/**
 * Schedule a retry after the backoff period
 */
function scheduleRetry(): void {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }
  
  // Schedule a retry after the backoff period
  retryTimeout = setTimeout(() => {
    console.log(`Backoff complete, retrying poll...`);
    currentBackoffMs = 0;
    pollForMentions();
  }, currentBackoffMs);
}

/**
 * Stop the polling service
 */
export function stopPollingService(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  
  console.log('Twitter polling service stopped');
  currentBackoffMs = 0;
  consecutiveErrors = 0;
}

/**
 * Get the status of the polling service
 */
export function getPollingStatus(): { 
  active: boolean; 
  intervalMs: number | null;
  lastPollTime: number;
  backoffMs: number;
  consecutiveErrors: number;
} {
  return {
    active: pollingInterval !== null,
    intervalMs: pollingInterval ? POLL_INTERVAL_MS : null,
    lastPollTime,
    backoffMs: currentBackoffMs,
    consecutiveErrors
  };
} 