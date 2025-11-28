/**
 * useLocationAutocomplete Hook
 * 
 * Custom hook for location autocomplete with cost optimization:
 * - 1.5 second debounce
 * - 5+ character minimum
 * - Session tokens for Google billing
 * - Local locations first, API as fallback
 * - Aggressive caching
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { searchLocalLocations } from "../utils/localLocations.js";
import { apiCache } from "../utils/apiCache.js";
import { rateLimiter } from "../utils/rateLimiter.js";

// Default options with cost optimization
const DEFAULT_OPTIONS = {
  debounceMs: 1500, // 1.5 seconds as per plan
  minChars: 5, // 5+ characters as per plan
  maxResults: 5,
  biasLocation: { lat: 26.1445, lng: 91.7362 }, // Guwahati center
  biasRadius: 50000, // 50km radius
  showLocalFirst: true, // Show local results immediately
  enableGoogleApi: true, // Enable Google API calls
};

export function useLocationAutocomplete(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'local' | 'cache' | 'api'

  // Refs for managing async operations
  const sessionTokenRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastQueryRef = useRef("");

  /**
   * Initialize or get existing session token
   * Session tokens group API calls for billing optimization
   */
  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current && window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      console.log("🎫 New session token created");
    }
    return sessionTokenRef.current;
  }, []);

  /**
   * Reset session token after selection
   * Important for proper billing - ends the session
   */
  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
    console.log("🎫 Session token reset");
  }, []);

  /**
   * Initialize AutocompleteService if not already done
   */
  const getAutocompleteService = useCallback(() => {
    if (!autocompleteServiceRef.current && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      console.log("🔧 AutocompleteService initialized");
    }
    return autocompleteServiceRef.current;
  }, []);

  /**
   * Search Google Places API with session token
   */
  const searchGooglePlaces = useCallback(
    async (searchQuery) => {
      const service = getAutocompleteService();
      if (!service) {
        console.warn("⚠️ AutocompleteService not available");
        return [];
      }

      // Check rate limiter
      if (!rateLimiter.canMakeRequest("autocomplete")) {
        console.warn("⛔ Autocomplete rate limited");
        setError("Please wait before searching again");
        return [];
      }

      return new Promise((resolve) => {
        const token = getSessionToken();

        service.getPlacePredictions(
          {
            input: searchQuery,
            sessionToken: token,
            locationBias: {
              center: config.biasLocation,
              radius: config.biasRadius,
            },
            componentRestrictions: { country: "in" }, // Restrict to India
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              console.log(`✅ Google API returned ${predictions.length} results`);
              rateLimiter.recordSuccess("autocomplete");
              
              // Transform to consistent format
              const results = predictions.slice(0, config.maxResults).map((pred) => ({
                name: pred.structured_formatting?.main_text || pred.description,
                fullAddress: pred.description,
                placeId: pred.place_id,
                type: "google",
                source: "api",
              }));
              
              resolve(results);
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.log("📭 No Google results found");
              resolve([]);
            } else {
              console.error("❌ Google Places API error:", status);
              if (status === "OVER_QUERY_LIMIT") {
                rateLimiter.recordError("autocomplete", 429);
              }
              resolve([]);
            }
          }
        );
      });
    },
    [config.biasLocation, config.biasRadius, config.maxResults, getAutocompleteService, getSessionToken]
  );

  /**
   * Main search function - combines local and API results
   */
  const performSearch = useCallback(
    async (searchQuery) => {
      const trimmedQuery = searchQuery.trim();
      
      // Don't search if query hasn't changed
      if (trimmedQuery === lastQueryRef.current) {
        return;
      }
      lastQueryRef.current = trimmedQuery;

      console.log(`🔍 Searching for: "${trimmedQuery}"`);

      // Step 1: Search local locations (instant, no API cost)
      const localResults = searchLocalLocations(trimmedQuery, config.maxResults);
      if (localResults.length > 0) {
        console.log(`📍 Found ${localResults.length} local results`);
        setSuggestions(localResults.map(loc => ({ ...loc, source: "local" })));
        setSource("local");
        
        // If we have enough local results, don't call API
        if (localResults.length >= config.maxResults) {
          setIsLoading(false);
          return;
        }
      }

      // Step 2: Check cache for API results
      const cachedResults = apiCache.getAutocomplete(trimmedQuery);
      if (cachedResults) {
        console.log(`💾 Using cached results for: "${trimmedQuery}"`);
        // Merge with local results, avoiding duplicates
        const merged = mergeResults(localResults, cachedResults);
        setSuggestions(merged);
        setSource("cache");
        setIsLoading(false);
        return;
      }

      // Step 3: Call Google API (only if enabled and no sufficient local results)
      if (config.enableGoogleApi && window.google?.maps?.places) {
        setIsLoading(true);
        
        try {
          const apiResults = await searchGooglePlaces(trimmedQuery);
          
          if (apiResults.length > 0) {
            // Cache the API results
            apiCache.setAutocomplete(trimmedQuery, apiResults);
            
            // Merge with local results
            const merged = mergeResults(localResults, apiResults);
            setSuggestions(merged);
            setSource("api");
          } else if (localResults.length > 0) {
            // Keep local results if API returned nothing
            setSuggestions(localResults.map(loc => ({ ...loc, source: "local" })));
            setSource("local");
          } else {
            setSuggestions([]);
          }
        } catch (err) {
          console.error("❌ Search error:", err);
          setError(err.message);
          // Fall back to local results
          if (localResults.length > 0) {
            setSuggestions(localResults.map(loc => ({ ...loc, source: "local" })));
          }
        }
        
        setIsLoading(false);
      } else {
        // No API available, use local results only
        setSuggestions(localResults.map(loc => ({ ...loc, source: "local" })));
        setSource("local");
        setIsLoading(false);
      }
    },
    [config.maxResults, config.enableGoogleApi, searchGooglePlaces]
  );

  /**
   * Merge local and API results, removing duplicates
   */
  const mergeResults = (localResults, apiResults) => {
    const seen = new Set();
    const merged = [];

    // Add local results first (they're instant and free)
    localResults.forEach((loc) => {
      const key = loc.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ ...loc, source: "local" });
      }
    });

    // Add API results that aren't duplicates
    apiResults.forEach((loc) => {
      const key = loc.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(loc);
      }
    });

    return merged.slice(0, config.maxResults);
  };

  /**
   * Handle input change with debouncing
   * This is the main entry point for user input
   */
  const handleInputChange = useCallback(
    (value) => {
      setQuery(value);
      setError(null);

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear suggestions if query is too short
      if (value.length < config.minChars) {
        setSuggestions([]);
        setSource(null);
        setIsLoading(false);
        return;
      }

      // Show local results immediately (no debounce for local)
      if (config.showLocalFirst) {
        const localResults = searchLocalLocations(value, config.maxResults);
        if (localResults.length > 0) {
          setSuggestions(localResults.map(loc => ({ ...loc, source: "local" })));
          setSource("local");
        }
      }

      // Debounce the API call
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, config.debounceMs);
    },
    [config.minChars, config.maxResults, config.showLocalFirst, config.debounceMs, performSearch]
  );

  /**
   * Handle selection of a suggestion
   */
  const handleSelect = useCallback(
    (suggestion) => {
      const address = suggestion.fullAddress || suggestion.description || suggestion.name;
      setQuery(address);
      setSuggestions([]);
      setSource(null);
      
      // Reset session token after selection (important for billing!)
      resetSessionToken();
      
      console.log(`✅ Selected: "${address}" (source: ${suggestion.source})`);
      
      return suggestion;
    },
    [resetSessionToken]
  );

  /**
   * Clear suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSource(null);
    setError(null);
  }, []);

  /**
   * Reset everything
   */
  const reset = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setSource(null);
    setError(null);
    setIsLoading(false);
    lastQueryRef.current = "";
    resetSessionToken();
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [resetSessionToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    query,
    suggestions,
    isLoading,
    error,
    source,
    
    // Actions
    handleInputChange,
    handleSelect,
    setQuery,
    clearSuggestions,
    reset,
    
    // Utilities
    getSessionToken,
    resetSessionToken,
  };
}

export default useLocationAutocomplete;
