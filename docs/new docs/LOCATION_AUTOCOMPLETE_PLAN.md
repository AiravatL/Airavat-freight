# Location Autocomplete Implementation Plan

## Overview

Implement location autocomplete/suggestions for the Origin and Destination input fields in the AiravatL Fare Calculator. The goal is to provide a fast, user-friendly experience while **minimizing Google Maps API costs**.

---

## Current State

- Users manually type full addresses in Origin and Destination fields
- No suggestions or autocomplete functionality
- Google Maps Directions API is called when both fields have values
- Rate limiting is already implemented (`rateLimiter.js`)
- Caching is already implemented (`apiCache.js`)

---

## Google Maps API Cost Considerations

### Relevant APIs & Pricing (as of 2024)

| API                           | Cost per 1,000 requests | Free Tier          |
| ----------------------------- | ----------------------- | ------------------ |
| Places Autocomplete           | $2.83                   | $200/month credit  |
| Places Autocomplete (Session) | $0.017 per session      | Included in credit |
| Geocoding API                 | $5.00                   | $200/month credit  |
| Directions API                | $5.00                   | $200/month credit  |

### Key Insight: Session Tokens

Google offers **Session-based Autocomplete** pricing:

- Without session: **$2.83 per 1,000 characters typed** (very expensive!)
- With session: **$0.017 per complete session** (from first keystroke to place selection)

A session groups all autocomplete requests from when user starts typing until they select a place.

---

## Cost Optimization Strategies

### 1. **Debouncing (Critical)**

- Don't call API on every keystroke
- Wait 300-500ms after user stops typing
- Reduces API calls by 70-80%

```
User types: "Guwahati Railway Station"
Without debounce: 24 API calls (one per character)
With 400ms debounce: 2-3 API calls
```

### 2. **Minimum Character Threshold**

- Only trigger autocomplete after 3+ characters
- Prevents API calls for single letters
- Reduces accidental/unnecessary calls

### 3. **Session Tokens (Essential)**

- Use `google.maps.places.AutocompleteSessionToken()`
- Same token for entire typing session
- New token after selection or timeout (3 minutes)
- **Saves ~99% on autocomplete costs**

### 4. **Local Caching**

- Cache autocomplete results for common searches
- Use existing `apiCache.js` infrastructure
- Cache key: normalized search query
- TTL: 24 hours (locations don't change often)

### 5. **Predefined Locations List**

- Show local suggestions FIRST before API call
- Guwahati-specific locations (already in `odMatrix`)
- Filter locally, only call API if no match

### 6. **Geographic Biasing**

- Restrict results to relevant area (Guwahati/Assam)
- Reduces irrelevant results
- Faster response times
- Use `bounds` or `componentRestrictions`

### 7. **Rate Limiting**

- Extend existing rate limiter for autocomplete
- Max 10 requests per minute per user
- Prevent abuse/runaway requests

---

## Implementation Architecture

### Component Structure

```
src/
├── components/
│   └── LocationAutocomplete.jsx    # New reusable component
├── hooks/
│   └── useLocationAutocomplete.js  # Custom hook for autocomplete logic
├── utils/
│   ├── apiCache.js                 # Existing - extend for autocomplete
│   ├── rateLimiter.js              # Existing - add autocomplete limits
│   └── localLocations.js           # New - predefined Guwahati locations
└── config/
    └── rateLimits.js               # Existing - add autocomplete config
```

### Data Flow

```
User Types → Debounce (400ms) → Check Min Length (3 chars)
                                      ↓
                              Check Local Cache
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
              Cache Hit                           Cache Miss
                    ↓                                   ↓
              Show Results              Check Predefined Locations
                                                       ↓
                                        ┌──────────────┴──────────────┐
                                        ↓                             ↓
                                  Has Matches                   No Matches
                                        ↓                             ↓
                                  Show Local                  Check Rate Limit
                                  + API Call                          ↓
                                                              Call Places API
                                                              (with session token)
                                                                      ↓
                                                              Cache Results
                                                                      ↓
                                                              Show Results
```

---

## Detailed Implementation Plan

### Phase 1: Foundation (Day 1)

#### 1.1 Create Predefined Locations List

```javascript
// src/utils/localLocations.js
export const GUWAHATI_LOCATIONS = [
  { name: "Ulubari", fullAddress: "Ulubari, Guwahati, Assam, India" },
  { name: "Panbazar", fullAddress: "Panbazar, Guwahati, Assam, India" },
  { name: "Ganeshguri", fullAddress: "Ganeshguri, Guwahati, Assam, India" },
  { name: "Beltola", fullAddress: "Beltola, Guwahati, Assam, India" },
  { name: "Jalukbari", fullAddress: "Jalukbari, Guwahati, Assam, India" },
  { name: "Six Mile", fullAddress: "Six Mile, Guwahati, Assam, India" },
  { name: "Zoo Road", fullAddress: "Zoo Road, Guwahati, Assam, India" },
  { name: "Chandmari", fullAddress: "Chandmari, Guwahati, Assam, India" },
  { name: "Maligaon", fullAddress: "Maligaon, Guwahati, Assam, India" },
  { name: "Dispur", fullAddress: "Dispur, Guwahati, Assam, India" },
  {
    name: "Guwahati Railway Station",
    fullAddress: "Guwahati Railway Station, Guwahati, Assam",
  },
  {
    name: "LGBI Airport",
    fullAddress: "Lokpriya Gopinath Bordoloi International Airport, Guwahati",
  },
  { name: "Kamakhya Temple", fullAddress: "Kamakhya Temple, Guwahati, Assam" },
  { name: "Fancy Bazar", fullAddress: "Fancy Bazar, Guwahati, Assam, India" },
  { name: "Paltan Bazar", fullAddress: "Paltan Bazar, Guwahati, Assam, India" },
  // ... more locations
];

export function searchLocalLocations(query) {
  const normalizedQuery = query.toLowerCase().trim();
  return GUWAHATI_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(normalizedQuery) ||
      loc.fullAddress.toLowerCase().includes(normalizedQuery)
  ).slice(0, 5); // Return max 5 results
}
```

#### 1.2 Update Rate Limiter Config

```javascript
// Add to src/config/rateLimits.js
autocomplete: {
  requestsPerMinute: 10,
  requestsPerDay: 100,
  backoffMs: 2000,
}
```

#### 1.3 Extend Cache for Autocomplete

```javascript
// Add to apiCache.js
// Key format: "autocomplete:query"
// TTL: 24 hours
```

---

### Phase 2: Core Hook (Day 2)

#### 2.1 Create useLocationAutocomplete Hook

```javascript
// src/hooks/useLocationAutocomplete.js
import { useState, useEffect, useRef, useCallback } from "react";
import { searchLocalLocations } from "../utils/localLocations";
import { apiCache } from "../utils/apiCache";
import { rateLimiter } from "../utils/rateLimiter";

export function useLocationAutocomplete(options = {}) {
  const {
    debounceMs = 400,
    minChars = 3,
    maxResults = 5,
    biasLocation = { lat: 26.1445, lng: 91.7362 }, // Guwahati
    biasRadius = 50000, // 50km
  } = options;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sessionTokenRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);

  // Initialize session token
  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current && window.google?.maps?.places) {
      sessionTokenRef.current =
        new window.google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  // Reset session token (call after selection)
  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  // Main search function
  const search = useCallback(async (searchQuery) => {
    // ... implementation
  }, []);

  // Debounced input handler
  const handleInputChange = useCallback(
    (value) => {
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (value.length < minChars) {
        setSuggestions([]);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        search(value);
      }, debounceMs);
    },
    [search, minChars, debounceMs]
  );

  // Handle selection
  const handleSelect = useCallback(
    (suggestion) => {
      setQuery(suggestion.fullAddress || suggestion.description);
      setSuggestions([]);
      resetSessionToken(); // Important for session pricing!
      return suggestion;
    },
    [resetSessionToken]
  );

  return {
    query,
    suggestions,
    isLoading,
    error,
    handleInputChange,
    handleSelect,
    setQuery,
  };
}
```

---

### Phase 3: UI Component (Day 3)

#### 3.1 Create LocationAutocomplete Component

```jsx
// src/components/LocationAutocomplete.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocationAutocomplete } from "../hooks/useLocationAutocomplete";

const LocationAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef(null);

  const {
    query,
    suggestions,
    isLoading,
    handleInputChange,
    handleSelect,
    setQuery,
  } = useLocationAutocomplete();

  // Sync external value
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    handleInputChange(newValue);
    onChange?.(newValue);
  };

  const handleSuggestionClick = (suggestion) => {
    const selected = handleSelect(suggestion);
    const address = selected.fullAddress || selected.description;
    onChange?.(address);
    onSelect?.(selected);
    setIsFocused(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
        />
        {isLoading && (
          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600" />
        )}
      </div>

      {/* Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id || index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
            >
              <div className="font-medium text-zinc-900">
                {suggestion.name || suggestion.structured_formatting?.main_text}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {suggestion.fullAddress ||
                  suggestion.structured_formatting?.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
```

---

### Phase 4: Integration (Day 4)

#### 4.1 Update AiravatLFareCalculatorPreview.jsx

Replace the current Origin/Destination inputs with the new `LocationAutocomplete` component.

```jsx
import LocationAutocomplete from './components/LocationAutocomplete';

// In the component:
<LocationAutocomplete
  value={origin}
  onChange={setOrigin}
  onSelect={(place) => console.log('Selected:', place)}
  label="Origin"
  placeholder="Enter origin (e.g., Ulubari, Guwahati)"
/>

<LocationAutocomplete
  value={destination}
  onChange={setDestination}
  onSelect={(place) => console.log('Selected:', place)}
  label="Destination"
  placeholder="Enter destination (e.g., Beltola, Guwahati)"
/>
```

---

## Cost Estimation

### Without Optimization (Worst Case)

- Average 20 characters typed per location
- 2 locations per fare calculation
- 40 API calls per calculation
- 100 calculations/day = 4,000 API calls
- **Cost: ~$11.32/day**

### With Full Optimization

- Debouncing: 2-3 API calls per location
- Session tokens: Billed as 1 session
- Local cache hits: ~40% queries
- Predefined locations: ~30% queries handled locally
- Effective API calls: ~1-2 per calculation
- 100 calculations/day = ~150 API calls
- **Cost: ~$0.42/day (96% savings!)**

---

## Testing Checklist

- [ ] Debouncing works (verify in Network tab)
- [ ] Session tokens are created and reused
- [ ] Session tokens reset after selection
- [ ] Local locations show instantly
- [ ] API results are cached
- [ ] Rate limiting prevents abuse
- [ ] Dropdown closes on outside click
- [ ] Keyboard navigation works (optional enhancement)
- [ ] Works with Google Maps not loaded (graceful fallback)
- [ ] Mobile-friendly dropdown

---

## Future Enhancements

1. **Keyboard Navigation** - Arrow keys to navigate, Enter to select
2. **Recent Searches** - Store user's recent locations in localStorage
3. **Favorites** - Let users save favorite locations
4. **Voice Input** - Use Web Speech API for voice location entry
5. **Current Location** - Use Geolocation API for "My Location"

---

## Timeline

| Phase     | Task                                 | Duration   |
| --------- | ------------------------------------ | ---------- |
| 1         | Foundation (local locations, config) | 1 day      |
| 2         | Core Hook Implementation             | 1 day      |
| 3         | UI Component                         | 1 day      |
| 4         | Integration & Testing                | 1 day      |
| **Total** |                                      | **4 days** |

---

## Files to Create/Modify

### New Files

- `src/components/LocationAutocomplete.jsx`
- `src/hooks/useLocationAutocomplete.js`
- `src/utils/localLocations.js`

### Modified Files

- `src/config/rateLimits.js` - Add autocomplete limits
- `src/utils/apiCache.js` - Add autocomplete cache methods
- `src/AiravatLFareCalculatorPreview.jsx` - Use new component

---

## Risk Mitigation

| Risk                  | Mitigation                                              |
| --------------------- | ------------------------------------------------------- |
| API costs spike       | Hard rate limits, monitoring alerts                     |
| Poor UX with debounce | Show local results immediately, API results after delay |
| Session token issues  | Fallback to per-request if tokens fail                  |
| Google API down       | Graceful fallback to predefined locations only          |

---

## Approval Needed

Before implementation:

1. Confirm the predefined locations list covers main use cases
2. Confirm debounce timing (400ms recommended)
3. Confirm rate limits (10/min, 100/day recommended)
4. Confirm geographic bias settings (Guwahati-focused)
