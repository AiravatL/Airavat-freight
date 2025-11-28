# API Integration & Debugging Guide

## ✅ Fixed Issue: API Not Being Called

### Problem Found
The Google Maps API key wasn't being exposed to the window object, so the component couldn't access it.

### Solution Applied

**Updated `src/main.jsx`:**
```javascript
// Expose Google Maps API key to window for use in components
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}
```

This ensures the API key from `.env` is available to all components at runtime.

---

## 🧪 Testing the API

### Step 1: Verify API Key is Loaded
Open DevTools Console (F12) and run:
```javascript
console.log(window.GOOGLE_MAPS_API_KEY);
```

You should see your API key printed.

### Step 2: Make a Test Request
Type in the Origin field: `Ulubari`
Type in the Destination field: `Panbazar`

Then check the console for logs like:
```
Fetching route from Google Maps: {originLabel: 'Ulubari', destinationLabel: 'Panbazar'}
Route fetched successfully: {distanceKm: 3.5, durationMin: 8.2, trafficLevel: 'Medium'}
```

### Step 3: Watch API Counter Increase
The UI should show:
```
API Requests: 1 · Cache Hit Rate: 0%
```

---

## 🐛 Debugging Checklist

If the API is still not being called, check:

### 1. **API Key Configured**
```bash
# In terminal
cat .env | grep VITE_GOOGLE_MAPS_API_KEY
```

Should output:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCfmNvhBpEH3QqxyusdEWpqWnXRKTOwiUU
```

### 2. **Console for Warnings**
Open DevTools Console and look for:
```
⚠️ API key not configured. Set VITE_GOOGLE_MAPS_API_KEY in .env
```

If you see this, restart `pnpm dev`

### 3. **Check Network Tab**
In DevTools Network tab:
- Look for requests to `maps.googleapis.com/maps/api/distancematrix/json`
- Should see a successful 200 response
- Check Response tab for the distance data

### 4. **Rate Limiter Status**
Run in console:
```javascript
import { rateLimiter } from "./utils/rateLimiter.js";
console.log(rateLimiter.getEndpointStatus());
```

Should show distanceMatrix endpoint status.

### 5. **Cache Stats**
Run in console:
```javascript
import { apiCache } from "./utils/apiCache.js";
console.log(apiCache.getStats());
```

Track cache performance.

---

## 📊 Full Testing Workflow

### Test 1: First Request
1. Enter origin: `Ulubari`
2. Enter destination: `Panbazar`
3. Check console for: `Fetching route from Google Maps...`
4. Wait ~2 seconds for response
5. Should see fare calculated

### Test 2: Cached Request
1. Keep same origin/destination
2. Should be instant (no API call)
3. Console shows cache hit

### Test 3: Rate Limiting
1. Rapidly change origin 30+ times
2. Should see: `Rate limit reached. Please wait...`
3. Auto-retry after timeout

### Test 4: Different Route
1. Change to: `Ganeshguri` → `Jalukbari`
2. Makes new API call
3. Different distance calculated

---

## 🔧 Console Commands for Testing

### Check Everything at Once
```javascript
import { rateLimiter } from "./utils/rateLimiter.js";
import { apiCache } from "./utils/apiCache.js";

console.log("=== API Key ===");
console.log(window.GOOGLE_MAPS_API_KEY);

console.log("\n=== Cache Stats ===");
console.log(apiCache.getStats());

console.log("\n=== Quota Info ===");
console.log(rateLimiter.getQuotaInfo());

console.log("\n=== Endpoint Status ===");
console.log(rateLimiter.getEndpointStatus());
```

### Simulate High Load
```javascript
import { rateLimiter } from "./utils/rateLimiter.js";

// Record 5 successful requests
for (let i = 0; i < 5; i++) {
  rateLimiter.recordSuccess("distanceMatrix");
}

// Check quota
console.log(rateLimiter.getQuotaInfo());
```

### Force an Error
```javascript
import { rateLimiter } from "./utils/rateLimiter.js";

// Record errors to trigger backoff
rateLimiter.recordError("distanceMatrix", 429);
rateLimiter.recordError("distanceMatrix", 429);
rateLimiter.recordError("distanceMatrix", 429);

// Check status
console.log(rateLimiter.getEndpointStatus());
```

---

## 📝 Console Output Examples

### Successful Request
```
Fetching route from Google Maps: {originLabel: 'Ulubari', destinationLabel: 'Panbazar'}
Route fetched successfully: {distanceKm: 3.5, durationMin: 8.2, trafficLevel: 'Medium'}
[RateLimit] {"timestamp":"2025-11-18T10:30:45.123Z","endpoint":"distanceMatrix","event":"success"}
```

### Cached Hit
```
(No network call - response used from cache instantly)
```

### Rate Limited
```
Rate limited. Retry in 2s
[RateLimit] {"timestamp":"2025-11-18T10:30:47.456Z","endpoint":"distanceMatrix","event":"backoff","delayMs":2000,"retryCount":1}
```

### API Error
```
API fetch error: TypeError: Failed to fetch
(Network error - check internet connection or CORS)
```

---

## ✅ Success Indicators

When working correctly, you should see:

1. ✅ API counter increases: `API Requests: 1 · Cache Hit Rate: 0%`
2. ✅ Distance calculated updates fare
3. ✅ Traffic level auto-detected (Low/Medium/High)
4. ✅ Second request with same route is instant (cached)
5. ✅ Console shows "Route fetched successfully"
6. ✅ Network tab shows successful Google Maps API call

---

## 🚀 Next Steps

If everything is working:
1. Test different route combinations
2. Monitor the cache hit rate increase
3. Check quota usage with quota display
4. Test rate limiting by rapid requests

If still having issues:
1. Check .env file has correct API key
2. Restart `pnpm dev`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check browser console for errors
5. Verify internet connection
6. Check Google Cloud Console API is enabled

