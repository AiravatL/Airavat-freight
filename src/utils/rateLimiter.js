/**
 * Advanced Rate Limiter with Quota Management & Exponential Backoff
 * 
 * Handles:
 * - Per-endpoint rate limiting
 * - Exponential backoff for failed requests
 * - Daily and monthly quota tracking
 * - Request queuing during backoff
 * - Graceful degradation
 */

import { RATE_LIMIT_CONFIG, GLOBAL_QUOTA, MONITORING, ERROR_HANDLING } from "../config/rateLimits.js";

class RateLimiter {
  constructor() {
    // Per-endpoint statistics
    this.endpoints = {};
    
    // Global quota tracking
    this.quota = {
      daily: {
        count: 0,
        resetTime: this.getNextMidnight(),
      },
      monthly: {
        count: 0,
        resetTime: this.getNextMonthStart(),
      },
    };

    // Request queue for backoff handling
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // Backoff state per endpoint
    this.backoffState = {};

    this.init();
  }

  /**
   * Initialize endpoint tracking
   */
  init() {
    Object.keys(RATE_LIMIT_CONFIG).forEach((key) => {
      const config = RATE_LIMIT_CONFIG[key];
      this.endpoints[key] = {
        name: config.name,
        lastRequestTime: 0,
        requestCount: {
          perMinute: [],
          perHour: [],
          perDay: 0,
        },
        errors: [],
        isBackedOff: false,
        backoffUntil: 0,
      };
      this.backoffState[key] = {
        retryCount: 0,
        currentDelayMs: config.backoff.initialDelayMs,
      };
    });
  }

  /**
   * Check if a request can proceed
   */
  canMakeRequest(endpointKey) {
    const config = RATE_LIMIT_CONFIG[endpointKey];
    const endpoint = this.endpoints[endpointKey];

    if (!config || !endpoint) {
      console.warn(`Unknown endpoint: ${endpointKey}`);
      return false;
    }

    // Check if currently backed off
    if (endpoint.isBackedOff && Date.now() < endpoint.backoffUntil) {
      return false;
    }

    if (endpoint.isBackedOff && Date.now() >= endpoint.backoffUntil) {
      endpoint.isBackedOff = false;
    }

    // Check minimum interval
    const timeSinceLastRequest = Date.now() - endpoint.lastRequestTime;
    if (timeSinceLastRequest < config.minIntervalMs) {
      return false;
    }

    // Check per-minute limit
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    endpoint.requestCount.perMinute = endpoint.requestCount.perMinute.filter(
      (t) => t > oneMinuteAgo
    );
    if (endpoint.requestCount.perMinute.length >= config.requestsPerMinute) {
      return false;
    }

    // Check per-hour limit
    const oneHourAgo = now - 3600000;
    endpoint.requestCount.perHour = endpoint.requestCount.perHour.filter(
      (t) => t > oneHourAgo
    );
    if (endpoint.requestCount.perHour.length >= config.requestsPerHour) {
      return false;
    }

    // Check per-day limit
    if (endpoint.requestCount.perDay >= config.requestsPerDay) {
      return false;
    }

    // Check global daily quota
    if (this.quota.daily.count >= GLOBAL_QUOTA.dailyRequests) {
      return false;
    }

    // Check global monthly quota
    if (this.quota.monthly.count >= GLOBAL_QUOTA.monthlyRequests) {
      return false;
    }

    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(endpointKey) {
    const endpoint = this.endpoints[endpointKey];
    if (!endpoint) return;

    const now = Date.now();
    endpoint.lastRequestTime = now;
    endpoint.requestCount.perMinute.push(now);
    endpoint.requestCount.perHour.push(now);
    endpoint.requestCount.perDay++;

    this.quota.daily.count++;
    this.quota.monthly.count++;

    // Reset backoff
    this.backoffState[endpointKey].retryCount = 0;
    this.backoffState[endpointKey].currentDelayMs = RATE_LIMIT_CONFIG[endpointKey].backoff.initialDelayMs;

    this.checkQuotaWarnings();
    this.logMetrics(endpointKey, "success");
  }

  /**
   * Record a failed request and apply backoff
   */
  recordError(endpointKey, statusCode) {
    const config = RATE_LIMIT_CONFIG[endpointKey];
    const endpoint = this.endpoints[endpointKey];
    if (!config || !endpoint) return;

    endpoint.errors.push({
      timestamp: Date.now(),
      statusCode,
    });

    // Check if retryable error
    if (!config.retryableErrors.includes(statusCode)) {
      this.logMetrics(endpointKey, "error", statusCode);
      return;
    }

    const backoff = this.backoffState[endpointKey];
    backoff.retryCount++;

    if (backoff.retryCount > config.maxRetries) {
      // Max retries exceeded
      this.logMetrics(endpointKey, "maxRetriesExceeded", statusCode);
      return false;
    }

    if (!config.backoff.enabled) {
      return false;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      backoff.currentDelayMs,
      config.backoff.maxDelayMs
    );

    endpoint.isBackedOff = true;
    endpoint.backoffUntil = Date.now() + delay;

    // Increase delay for next retry
    backoff.currentDelayMs = Math.min(
      backoff.currentDelayMs * config.backoff.multiplier,
      config.backoff.maxDelayMs
    );

    this.logMetrics(endpointKey, "backoff", { statusCode, delayMs: delay, retryCount: backoff.retryCount });

    return true; // Can retry
  }

  /**
   * Get quota information
   */
  getQuotaInfo() {
    const now = Date.now();

    // Check if daily reset is needed
    if (now > this.quota.daily.resetTime) {
      this.quota.daily = { count: 0, resetTime: this.getNextMidnight() };
    }

    // Check if monthly reset is needed
    if (now > this.quota.monthly.resetTime) {
      this.quota.monthly = { count: 0, resetTime: this.getNextMonthStart() };
    }

    const dailyUsagePercent = (this.quota.daily.count / GLOBAL_QUOTA.dailyRequests) * 100;
    const monthlyUsagePercent = (this.quota.monthly.count / GLOBAL_QUOTA.monthlyRequests) * 100;

    return {
      daily: {
        used: this.quota.daily.count,
        limit: GLOBAL_QUOTA.dailyRequests,
        percentUsed: dailyUsagePercent.toFixed(1),
        warning: dailyUsagePercent > GLOBAL_QUOTA.warningThresholdPercent,
        critical: dailyUsagePercent > GLOBAL_QUOTA.criticalThresholdPercent,
      },
      monthly: {
        used: this.quota.monthly.count,
        limit: GLOBAL_QUOTA.monthlyRequests,
        percentUsed: monthlyUsagePercent.toFixed(1),
        warning: monthlyUsagePercent > GLOBAL_QUOTA.warningThresholdPercent,
        critical: monthlyUsagePercent > GLOBAL_QUOTA.criticalThresholdPercent,
      },
    };
  }

  /**
   * Get current status of all endpoints
   */
  getEndpointStatus() {
    return Object.entries(this.endpoints).map(([key, endpoint]) => ({
      key,
      name: endpoint.name,
      canMakeRequest: this.canMakeRequest(key),
      isBackedOff: endpoint.isBackedOff,
      backoffUntilMs: endpoint.backoffUntil - Date.now(),
      requestsPerMinute: endpoint.requestCount.perMinute.length,
      requestsPerDay: endpoint.requestCount.perDay,
      recentErrors: endpoint.errors.slice(-5),
    }));
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.init();
  }

  /**
   * Private helpers
   */
  getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  getNextMonthStart() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.getTime();
  }

  checkQuotaWarnings() {
    if (!MONITORING.showWarnings) return;

    const quota = this.getQuotaInfo();

    if (quota.daily.warning) {
      console.warn(`⚠️ Daily API quota warning: ${quota.daily.percentUsed}% used`);
    }
    if (quota.daily.critical) {
      console.error(`🚨 CRITICAL: Daily API quota at ${quota.daily.percentUsed}%`);
    }
    if (quota.monthly.warning) {
      console.warn(`⚠️ Monthly API quota warning: ${quota.monthly.percentUsed}% used`);
    }
    if (quota.monthly.critical) {
      console.error(`🚨 CRITICAL: Monthly API quota at ${quota.monthly.percentUsed}%`);
    }
  }

  logMetrics(endpointKey, eventType, data = {}) {
    if (!MONITORING.logEvents) return;

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      endpoint: endpointKey,
      event: eventType,
      ...data,
    };

    console.log(`[RateLimit] ${JSON.stringify(logData)}`);
  }
}

export const rateLimiter = new RateLimiter();
