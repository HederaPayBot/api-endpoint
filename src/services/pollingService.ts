import axios from 'axios';

/**
 * Service to periodically poll for Twitter mentions and process them
 */
let pollingInterval: NodeJS.Timeout | null = null;
const POLL_INTERVAL_MS = 60000; // Default to 1 minute

/**
 * Start the polling service
 * @param intervalMs Polling interval in milliseconds
 */
export function startPollingService(intervalMs = POLL_INTERVAL_MS): void {
  // Clear any existing interval first
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  console.log(`Starting Twitter polling service with interval of ${intervalMs}ms`);
  
  // Set up the polling interval
  pollingInterval = setInterval(async () => {
    try {
      // Call our local API endpoint to process mentions
      const response = await axios.get('http://localhost:' + (process.env.PORT || '5001') + '/api/twitter/poll-mentions');
      
      const { processed, errors } = response.data;
      
      if (processed > 0) {
        console.log(`Poll completed: processed ${processed} new mentions`);
      }
      
      if (errors && errors.length > 0) {
        console.error(`Poll encountered ${errors.length} errors:`, errors);
      }
    } catch (error) {
      console.error('Error polling for Twitter mentions:', error);
    }
  }, intervalMs);
}

/**
 * Stop the polling service
 */
export function stopPollingService(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Twitter polling service stopped');
  }
}

/**
 * Get the status of the polling service
 */
export function getPollingStatus(): { active: boolean; intervalMs: number | null } {
  return {
    active: pollingInterval !== null,
    intervalMs: pollingInterval ? POLL_INTERVAL_MS : null
  };
} 