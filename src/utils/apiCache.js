/**
 * API Response Cache System
 * 
 * Reduces redundant API calls by caching responses with TTL
 * Implements LRU eviction when cache reaches max entries
 */

import { CACHE_CONFIG } from "../config/rateLimits.js";

class APICache {
  constructor() {
    this.cache = new Map();
    this.autocompleteCache = new Map(); // Separate cache for autocomplete
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      autocompleteHits: 0,
      autocompleteMisses: 0,
    };
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(endpoint, origin, destination, includeTraffic = false) {
    let key = `${endpoint}|${origin}|${destination}`;
    if (includeTraffic) {
      key += `|${new Date().getHours()}`; // Different cache per hour for traffic
    }
    return key;
  }

  /**
   * Generate cache key for autocomplete queries
   */
  generateAutocompleteKey(query) {
    return `autocomplete|${query.toLowerCase().trim()}`;
  }

  /**
   * Get cached autocomplete results
   */
  getAutocomplete(query) {
    if (!CACHE_CONFIG.enabled || !query) return null;

    const key = this.generateAutocompleteKey(query);
    const cached = this.autocompleteCache.get(key);

    if (!cached) {
      this.stats.autocompleteMisses++;
      return null;
    }

    // Check if cache is still valid (24 hours for autocomplete)
    const ttl = CACHE_CONFIG.autocompleteTtlMs || 86400000;
    const now = Date.now();
    if (now - cached.timestamp > ttl) {
      this.autocompleteCache.delete(key);
      this.stats.autocompleteMisses++;
      return null;
    }

    this.stats.autocompleteHits++;
    console.log(`🎯 Autocomplete cache hit for: "${query}"`);
    return cached.data;
  }

  /**
   * Store autocomplete results in cache
   */
  setAutocomplete(query, results) {
    if (!CACHE_CONFIG.enabled || !query || !results) return;

    const key = this.generateAutocompleteKey(query);
    const maxEntries = CACHE_CONFIG.maxAutocompleteEntries || 200;

    // Remove oldest entry if max size reached
    if (this.autocompleteCache.size >= maxEntries && !this.autocompleteCache.has(key)) {
      const firstKey = this.autocompleteCache.keys().next().value;
      this.autocompleteCache.delete(firstKey);
    }

    this.autocompleteCache.set(key, {
      data: results,
      timestamp: Date.now(),
    });

    console.log(`💾 Cached autocomplete results for: "${query}"`);
  }

  /**
   * Clear autocomplete cache
   */
  clearAutocomplete() {
    this.autocompleteCache.clear();
    this.stats.autocompleteHits = 0;
    this.stats.autocompleteMisses = 0;
    console.log("🗑️ Autocomplete cache cleared");
  }

  /**
   * Get cached value if still valid
   */
  get(endpoint, origin, destination) {
    if (!CACHE_CONFIG.enabled) return null;

    const key = this.generateKey(
      endpoint,
      origin,
      destination,
      CACHE_CONFIG.includeTrafficInKey
    );

    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  /**
   * Store value in cache
   */
  set(endpoint, origin, destination, data) {
    if (!CACHE_CONFIG.enabled) return;

    const key = this.generateKey(
      endpoint,
      origin,
      destination,
      CACHE_CONFIG.includeTrafficInKey
    );

    // Remove oldest entry if max size reached
    if (
      this.cache.size >= CACHE_CONFIG.maxEntriesPerEndpoint &&
      !this.cache.has(key)
    ) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    this.stats.entries = this.cache.size;
  }

  /**
   * Clear cache - optionally clear specific entry or all
   * @param {string} endpoint - Endpoint name (e.g., 'directions')
   * @param {string} origin - Optional origin location
   * @param {string} destination - Optional destination location
   */
  clear(endpoint, origin, destination) {
    if (!endpoint) {
      // Clear all cache if no params provided
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, entries: 0 };
      return;
    }

    if (origin && destination) {
      // BUG #3 FIX: Clear specific cache entry for a route
      const key = this.generateKey(endpoint, origin, destination, false);
      if (this.cache.has(key)) {
        this.cache.delete(key);
        this.stats.entries = this.cache.size;
        console.log(`🗑️ Cleared cache for ${endpoint}: ${origin} → ${destination}`);
      }
    }
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio() {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : ((this.stats.hits / total) * 100).toFixed(1);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const autocompleteTotal = this.stats.autocompleteHits + this.stats.autocompleteMisses;
    const autocompleteHitRatio = autocompleteTotal === 0 
      ? 0 
      : ((this.stats.autocompleteHits / autocompleteTotal) * 100).toFixed(1);

    return {
      ...this.stats,
      hitRatio: `${this.getHitRatio()}%`,
      autocompleteHitRatio: `${autocompleteHitRatio}%`,
      autocompleteCacheSize: this.autocompleteCache.size,
    };
  }
}

export const apiCache = new APICache();
