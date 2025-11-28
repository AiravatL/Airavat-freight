/**
 * Rate Limiting Configuration
 * 
 * Defines per-endpoint rate limits, quotas, and backoff strategies
 * for all external APIs used in the application.
 */

export const RATE_LIMIT_CONFIG = {
  // Distance Matrix API limits
  distanceMatrix: {
    name: "Distance Matrix",
    endpoint: "https://maps.googleapis.com/maps/api/distancematrix/json",
    // Minimum milliseconds between requests to this endpoint
    minIntervalMs: 1000,
    // Maximum requests per minute
    requestsPerMinute: 30,
    // Maximum requests per hour
    requestsPerHour: 1000,
    // Maximum requests per day
    requestsPerDay: 25000,
    // Exponential backoff settings
    backoff: {
      enabled: true,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      multiplier: 2,
    },
    // Enable retry on specific error codes
    retryableErrors: [408, 429, 500, 502, 503, 504],
    maxRetries: 3,
  },
  
  // Directions API limits (for future use)
  directions: {
    name: "Directions API",
    endpoint: "https://maps.googleapis.com/maps/api/directions/json",
    minIntervalMs: 1000,
    requestsPerMinute: 30,
    requestsPerHour: 1200,
    requestsPerDay: 25000,
    backoff: {
      enabled: true,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      multiplier: 2,
    },
    retryableErrors: [408, 429, 500, 502, 503, 504],
    maxRetries: 3,
  },

  // Place Autocomplete API limits (for future use)
  places: {
    name: "Places API",
    endpoint: "https://maps.googleapis.com/maps/api/place/autocomplete/json",
    minIntervalMs: 1000,
    requestsPerMinute: 30,
    requestsPerHour: 1500,
    requestsPerDay: 30000,
    backoff: {
      enabled: true,
      initialDelayMs: 500,
      maxDelayMs: 30000,
      multiplier: 1.5,
    },
    retryableErrors: [408, 429, 500, 502, 503, 504],
    maxRetries: 2,
  },

  // Autocomplete with aggressive cost optimization
  autocomplete: {
    name: "Autocomplete",
    endpoint: "places-autocomplete",
    // Aggressive rate limiting to minimize costs
    minIntervalMs: 1500, // 1.5 seconds between requests (matches debounce)
    requestsPerMinute: 10, // Max 10 requests per minute
    requestsPerHour: 100, // Max 100 per hour
    requestsPerDay: 500, // Max 500 per day
    backoff: {
      enabled: true,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
      multiplier: 2,
    },
    retryableErrors: [408, 429, 500, 502, 503, 504],
    maxRetries: 1, // Minimal retries to save costs
  },
};

/**
 * Global quota limits for the entire application
 * Helps prevent exceeding billing tier limits
 */
export const GLOBAL_QUOTA = {
  // Monthly quota (adjust based on billing tier)
  monthlyRequests: 25000,
  dailyRequests: 1000,
  
  // Warning thresholds
  warningThresholdPercent: 80,
  criticalThresholdPercent: 95,
};

/**
 * Cache settings to reduce redundant API calls
 */
export const CACHE_CONFIG = {
  // Time-to-live for cached results (in milliseconds)
  ttlMs: 300000, // 5 minutes
  
  // Autocomplete cache TTL (longer since locations don't change)
  autocompleteTtlMs: 86400000, // 24 hours
  
  // Maximum number of cached entries per endpoint
  maxEntriesPerEndpoint: 100,
  
  // Maximum autocomplete cache entries
  maxAutocompleteEntries: 200,
  
  // Enable caching globally
  enabled: true,
  
  // Cache key generation strategy
  includeTrafficInKey: true, // Include traffic conditions in cache key
};

/**
 * Error handling and fallback strategies
 */
export const ERROR_HANDLING = {
  // Show user-friendly error messages
  userMessages: {
    429: "Too many requests. Please try again in a moment.",
    500: "Server error. Please try again later.",
    503: "Service temporarily unavailable. Please retry.",
    quotaExceeded: "API quota reached. Using cached or default data.",
    networkError: "Network error. Using cached data if available.",
    invalidApiKey: "API key is invalid or not configured.",
  },
  
  // Fallback behavior when rate limited
  fallback: {
    useCache: true,
    usePreviousValue: true,
    useDefaultMultiplier: true,
  },
};

/**
 * Metrics and monitoring settings
 */
export const MONITORING = {
  // Log rate limit events
  logEvents: true,
  
  // Display warnings in console when approaching limits
  showWarnings: true,
  
  // Track metrics for analysis
  trackMetrics: true,
  
  // Reset metrics daily
  resetDaily: true,
};
