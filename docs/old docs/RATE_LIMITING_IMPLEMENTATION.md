# Advanced Rate Limiting Implementation

## ✅ Complete Implementation

Your project now has enterprise-grade rate limiting with all the following features implemented:

---

## 📋 Features Implemented

### 1. **Per-Endpoint Rate Limiting**
- ✅ Configurable limits for Distance Matrix, Directions, and Places APIs
- ✅ Minimum interval between requests
- ✅ Per-minute, per-hour, and per-day request limits
- Location: `src/config/rateLimits.js`

### 2. **Global Quota Management**
- ✅ Daily quota tracking (1,000 requests/day default)
- ✅ Monthly quota tracking (25,000 requests/month default)
- ✅ Automatic quota reset at midnight and month start
- ✅ Warning thresholds (80% and 95%)
- Location: `src/utils/rateLimiter.js`

### 3. **Exponential Backoff & Retry Logic**
- ✅ Automatic retry with exponential backoff on failures
- ✅ Configurable delay multiplier (default 2x)
- ✅ Max delay cap (60 seconds default)
- ✅ Max retry attempts (3 default)
- ✅ Detects retryable errors (408, 429, 500-504)
- Location: `src/utils/rateLimiter.js`

### 4. **Response Caching**
- ✅ 5-minute TTL for cached responses
- ✅ LRU eviction when cache fills
- ✅ Cache hit rate tracking
- ✅ Separate cache per route (origin-destination pair)
- ✅ Traffic-aware caching (different cache per hour)
- Location: `src/utils/apiCache.js`

### 5. **Graceful Degradation**
- ✅ Fallback to cached data when rate limited
- ✅ User-friendly error messages
- ✅ Automatic retry on backoff
- ✅ Prevents quota exceeded errors
- Location: `src/AiravatLFareCalculatorPreview.jsx`

### 6. **Metrics & Monitoring**
- ✅ Per-endpoint error tracking
- ✅ Request count logging
- ✅ Cache hit ratio reporting
- ✅ Quota usage percentage
- ✅ Console warnings when limits approached
- ✅ Backoff state visibility
- Location: `src/utils/rateLimiter.js`

---

## 🗂️ File Structure

```
src/
├── config/
│   └── rateLimits.js           # Configuration for all rate limits
├── utils/
│   ├── rateLimiter.js          # Core rate limiting logic
│   └── apiCache.js             # Response caching system
└── AiravatLFareCalculatorPreview.jsx  # Updated with new features
```

---

## ⚙️ Configuration

All settings are in `src/config/rateLimits.js` and can be overridden via `.env`:

### Default Limits

```javascript
// Distance Matrix API
- Minimum interval: 2000ms (2 seconds)
- Per minute: 25 requests
- Per hour: 1,000 requests
- Per day: 25,000 requests

// Global
- Daily quota: 1,000 requests
- Monthly quota: 25,000 requests
- Cache TTL: 5 minutes
- Max retries: 3
```

### Environment Variables (in `.env`)

```env
VITE_RATE_LIMIT_DISTANCE_MATRIX_MIN_INTERVAL_MS=2000
VITE_RATE_LIMIT_DISTANCE_MATRIX_PER_MINUTE=25
VITE_RATE_LIMIT_DISTANCE_MATRIX_PER_HOUR=1000
VITE_RATE_LIMIT_DISTANCE_MATRIX_PER_DAY=25000

VITE_GLOBAL_QUOTA_DAILY=1000
VITE_GLOBAL_QUOTA_MONTHLY=25000

VITE_CACHE_TTL_MS=300000
VITE_CACHE_MAX_ENTRIES=100
VITE_CACHE_ENABLED=true

VITE_BACKOFF_INITIAL_DELAY_MS=1000
VITE_BACKOFF_MAX_DELAY_MS=60000
VITE_BACKOFF_MULTIPLIER=2

VITE_MAX_RETRIES=3
VITE_SHOW_QUOTA_WARNINGS=true
VITE_LOG_RATE_LIMIT_EVENTS=true
```

---

## 🚀 How It Works

### Request Flow

```
1. User changes origin/destination
   ↓
2. Check if request already cached
   ├─ If cached & valid → Use cache result ✅
   └─ If not cached/expired → Continue to step 3
   ↓
3. Check rate limiter
   ├─ Not ready (too recent) → Wait ⏳
   ├─ Backed off (failed retry) → Wait with exponential delay ⏳
   ├─ Quota exceeded → Show error & use fallback 🚫
   └─ Ready → Continue to step 4 ✅
   ↓
4. Make API request to Google Maps
   ↓
5. Handle response
   ├─ Success → Cache result + Record success ✅
   ├─ Retryable error (429, 500, etc.) → Apply exponential backoff 🔄
   └─ Non-retryable error → Record error, show message ❌
```

---

## 📊 Monitoring & Debugging

### Check Quota Status

```javascript
import { rateLimiter } from "./utils/rateLimiter";

// Get current quota info
const quota = rateLimiter.getQuotaInfo();
console.log(quota);
// Output:
// {
//   daily: { used: 45, limit: 1000, percentUsed: "4.5", warning: false, critical: false },
//   monthly: { used: 240, limit: 25000, percentUsed: "0.96", warning: false, critical: false }
// }
```

### Check Endpoint Status

```javascript
const endpoints = rateLimiter.getEndpointStatus();
console.log(endpoints);
// Output: Array of endpoint statuses with backoff state, request counts, etc.
```

### Check Cache Statistics

```javascript
import { apiCache } from "./utils/apiCache";

console.log(apiCache.getStats());
// Output:
// { hits: 12, misses: 3, entries: 5, hitRatio: "80.0%" }
```

### Console Warnings

When approaching limits, you'll see warnings:

```
⚠️ Daily API quota warning: 85% used
🚨 CRITICAL: Daily API quota at 96%
[RateLimit] {"timestamp":"2025-11-18T10:30:45.123Z","endpoint":"distanceMatrix","event":"backoff","delayMs":2000,"retryCount":1}
```

---

## 🛡️ Error Handling

### Handled Scenarios

| Scenario | Behavior |
|----------|----------|
| Network error | Retry with exponential backoff |
| 429 (Too Many Requests) | Backoff & retry (rate limited) |
| 500/502/503 (Server error) | Retry with exponential backoff |
| Quota exceeded | Show error, use cached data |
| Cache hit | Use cached response immediately |
| Backoff in progress | Queue request, retry after delay |
| Max retries exceeded | Show error, fallback to default |

### User-Friendly Messages

- "Rate limited. Retry in Xs"
- "API quota exceeded for today"
- "HTTP 500: Internal Server Error"
- "Too many requests. Please try again in a moment."

---

## 🔧 Customization

### Adjust Rate Limits

Edit `src/config/rateLimits.js`:

```javascript
export const RATE_LIMIT_CONFIG = {
  distanceMatrix: {
    minIntervalMs: 1000,        // More aggressive
    requestsPerMinute: 50,       // Higher limit
    backoff: {
      initialDelayMs: 500,       // Shorter initial wait
      maxDelayMs: 30000,         // Lower max wait
      multiplier: 1.5,           // Less aggressive backoff
    },
  },
};
```

### Disable Caching

In `.env`:
```env
VITE_CACHE_ENABLED=false
```

### Disable Backoff

Edit `src/config/rateLimits.js`:
```javascript
backoff: {
  enabled: false,  // Disable exponential backoff
}
```

---

## 📈 Best Practices

1. **Monitor Quota Usage**: Check quota warnings in console
2. **Adjust Limits**: Set realistic limits based on your billing tier
3. **Cache Strategically**: Keep TTL reasonable (5 min recommended)
4. **Error Handling**: Always implement fallbacks
5. **Testing**: Use dev tools to check metrics during testing

---

## 🧪 Testing Rate Limiting

### Force Rate Limit (Development Only)

```javascript
// In browser console:
import { rateLimiter } from "./utils/rateLimiter";

// Record fake errors to trigger backoff:
rateLimiter.recordError("distanceMatrix", 429);
rateLimiter.recordError("distanceMatrix", 429);
rateLimiter.recordError("distanceMatrix", 429);

// Check status:
console.log(rateLimiter.getEndpointStatus());
```

### Check Cache Performance

```javascript
import { apiCache } from "./utils/apiCache";
console.log(apiCache.getStats());
// Keep checking after making same requests multiple times
```

---

## 🔐 Security Notes

✅ **API Key Protection:**
- Key is stored in `.env.local` (not committed to git)
- Only used server-side in production (not exposed in frontend)
- Rate limiting prevents abuse

✅ **Quota Protection:**
- Daily and monthly limits prevent excessive charges
- Warning thresholds alert before critical levels
- Automatic backoff prevents quota exceeded errors

---

## 📚 API Reference

### `rateLimiter.canMakeRequest(endpointKey)`

Returns `boolean` - Whether request can proceed

### `rateLimiter.recordSuccess(endpointKey)`

Records successful request, updates quota

### `rateLimiter.recordError(endpointKey, statusCode)`

Records error, triggers backoff if retryable. Returns `boolean` - can retry

### `rateLimiter.getQuotaInfo()`

Returns quota usage and warning status

### `rateLimiter.getEndpointStatus()`

Returns array of all endpoint statuses

### `apiCache.get(endpoint, origin, destination)`

Returns cached data if valid, `null` otherwise

### `apiCache.set(endpoint, origin, destination, data)`

Stores data in cache

### `apiCache.getStats()`

Returns cache statistics (hits, misses, hit ratio)

---

## ✨ What's New vs Before

| Feature | Before | After |
|---------|--------|-------|
| Rate limiting | Basic 2s throttle | Advanced per-endpoint limiting |
| Retry logic | None | Exponential backoff with max retries |
| Caching | None | 5-min TTL with LRU eviction |
| Quota tracking | None | Daily & monthly quotas |
| Error handling | Simple | Graceful with fallbacks |
| Monitoring | Request counter | Full metrics & warnings |
| Configurability | Hardcoded | Fully configurable |

---

## 🎯 Next Steps

1. **Test the implementation**: Make several route searches and check console
2. **Adjust limits**: Based on your Google Cloud billing tier
3. **Monitor quota**: Watch for warnings in console
4. **Deploy with confidence**: Rate limiting prevents unexpected charges

---

## 📞 Troubleshooting

**Q: Always getting "Rate limited" error?**
A: Check that `minIntervalMs` is reasonable (default 2000ms). Reduce if needed.

**Q: Cache not working?**
A: Ensure `VITE_CACHE_ENABLED=true` in `.env`. Check with `apiCache.getStats()`.

**Q: Exponential backoff takes too long?**
A: Reduce `backoff.multiplier` or `backoff.maxDelayMs` in config.

**Q: Quota warnings appearing?**
A: You're using 80%+ of quota. Increase `GLOBAL_QUOTA_DAILY` or reduce `requestsPerMinute`.

