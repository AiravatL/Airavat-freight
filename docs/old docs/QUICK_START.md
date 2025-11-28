# Quick Start: Running the Fixed Calculator

## 🚀 Get Started in 3 Steps

### **Step 1: Install Dependencies (If Not Already Done)**
```powershell
cd "d:\calculator rate"
pnpm install
```

### **Step 2: Start Development Server**
```powershell
pnpm dev
```

Expected output:
```
  VITE v5.4.21  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### **Step 3: Open Browser**
- Navigate to: **http://localhost:5173/**
- The calculator should load with:
  - Trip Parameters section (left)
  - Fare Breakdown (right)
  - **Interactive Google Map** with route visualization

---

## 🗺️ What You'll See

### **Map Section**
```
┌─ Live Route & Traffic (Google Maps) ─────────┐
│                                              │
│  [Interactive Map with Purple Route]        │
│                                              │
│  ✅ Route ready • 3.5 km • 8 mins           │
└──────────────────────────────────────────────┘
```

### **Default Route**
- **From:** Ulubari (default)
- **To:** Panbazar (default)
- **Expected Distance:** 3.5 km
- **Expected Fare:** ₹293 (approximately)

---

## 🧪 Testing the Features

### **Test 1: View the Map (Immediate)**
```
1. Page loads
2. Look for interactive map in upper left
3. Should show Google Map with purple route line
4. Can zoom, pan, fullscreen
```

### **Test 2: Change Route (2 Second Wait)**
```
1. Edit "Origin" field: type "Ganeshguri"
2. Wait 2 seconds
3. Map updates with new route to Ganeshguri
4. Fare recalculates automatically
5. Status shows: "✅ Route ready • X km • Y mins"
```

### **Test 3: Cache Performance (5 Minutes)**
```
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Change to route: Ulubari → Panbazar
4. Wait 2 seconds → See map + console shows: ✅ Route fetched
5. Change again to same route within 5 minutes
6. Map updates instantly
7. Console shows: ✅ Cache hit!
```

### **Test 4: Verify Distance Usage**
```
1. Note the distance shown on map
2. Check "Trip Distance" in Fare Breakdown (right side)
3. Should match the map distance
4. Fare = (base + distance * ₹30) * multipliers
5. Example: (₹150 + 3.5 * ₹30) = ₹255 before multipliers
```

### **Test 5: Fullscreen Map**
```
1. Click fullscreen icon (⛶) in map corner
2. Map expands to full screen
3. Can see larger view
4. Press ESC to exit fullscreen
5. Returns to normal view
```

---

## 🔍 Debugging in Console (F12)

### **Expected Console Messages**

**On Page Load:**
```
✅ Cache hit! Using cached result: { distance: 3.5, duration: 8 }
✅ Route calculated successfully
✅ Route ready • 3.5 km • 8 mins
```

**On New Route:**
```
Checking cache for: Ulubari|Ganeshguri
Checking rate limiter for directions API...
📡 Fetching live route from Google Maps...
✅ Route calculated successfully
```

**On Rate Limit (After 25 Requests/Minute):**
```
Rate limiter blocked request: { isBackedOff: true, ... }
Rate limited. Please wait...
```

### **No Error Should Appear For:**
- Missing map (should always render)
- Route not found (fallback to manual distance)
- API key missing (should show in console only, not crash)

---

## 📊 Monitoring Performance

### **Check Cache Hit Rate**
Look at the Fare Breakdown section → Bottom of right panel shows live distance info

### **Check API Usage**
- Open DevTools → Network tab
- Look for `distancematrix` or `directions` requests
- Cached requests won't appear in Network tab
- Only actual API calls appear

### **Check Rate Limiting**
- Make route changes rapidly (< 2 second intervals)
- Rate limiter prevents requests if too fast
- Console shows: "Request already in flight, skipping"
- This is normal and prevents duplicate calls

---

## 🎯 Key Features to Verify

| Feature | How to Test | Expected Result |
|---------|------------|-----------------|
| **Map Loads** | Page loads | Interactive map visible |
| **Route Displays** | Ulubari → Panbazar | Purple line shows path |
| **Distance Updates** | Change destination | Map updates, distance changes |
| **Fare Recalculates** | Any change | Final fare updates |
| **Cache Works** | Same route twice | 2nd time instant (console: cache hit) |
| **Zoom Works** | Scroll on map | Map zooms in/out |
| **Fullscreen** | Click ⛶ button | Map fills screen |
| **Status Shows** | After API call | "✅ Route ready • X km • Y mins" |
| **Error Handling** | Invalid location | Shows graceful error or fallback |

---

## ⚙️ Configuration Verification

### **Check Environment Setup**
```powershell
# Verify API key is set
Write-Host $env:VITE_GOOGLE_MAPS_API_KEY
# Should show: AIzaSyCfmNvhBpEH3QqxyusdEWpqWnXRKTOwiUU (or your key)
```

### **Check .env File**
```
# d:\calculator rate\.env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCfmNvhBpEH3QqxyusdEWpqWnXRKTOwiUU
```

### **Check vite.config.js**
```javascript
// Should have env variable exposed
export default defineConfig({
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY)
  }
})
```

---

## 🛠️ Building for Production

### **Build Command**
```powershell
pnpm run build
```

Expected output:
```
✅ built in 3.72s

dist/index.html              0.43 kB │ gzip:   0.29 kB
dist/assets/index-xxx.css   17.85 kB │ gzip:   3.92 kB
dist/assets/index-xxx.js   434.90 kB │ gzip: 123.59 kB
```

### **Preview Production Build**
```powershell
pnpm run preview
```

Then visit the URL shown in console (usually http://localhost:4173/)

---

## 🐛 Troubleshooting

### **Map Not Showing**
```
✓ Check API key in .env
✓ Check internet connection
✓ Open DevTools (F12) → Look for errors
✓ Check console for: "API key not configured"
```

### **Route Not Updating**
```
✓ Wait 2 seconds after typing (debounce)
✓ Check if rate limited: "Rate limited. Please wait..."
✓ Verify origin/destination are valid
✓ Check console for error messages
```

### **Cache Not Working**
```
✓ Cache is 5 minutes TTL (after 5 min, new API call)
✓ Cache key is: "pickupLocation|dropoffLocation"
✓ Check console: should show "✅ Cache hit!" for same route
```

### **Distance Not Matching Map**
```
✓ Distance is extracted from Google Directions API
✓ Should match the purple route line on map
✓ OD Matrix is fallback if API fails
✓ Manual distance is last resort
```

---

## 📱 Testing Different Routes

### **Built-in OD Matrix Routes** (Predefined, instant cache)
```
Ulubari ↔ Panbazar       (3.5 km)
Ulubari ↔ Ganeshguri     (3.5 km)
Ulubari ↔ Beltola        (6 km)
Ulubari ↔ Jalukbari      (8 km)
Ulubari ↔ Six Mile       (6 km)
Panbazar ↔ Ganeshguri    (6 km)
Panbazar ↔ Beltola       (8.5 km)
Panbazar ↔ Jalukbari     (7 km)
Panbazar ↔ Six Mile      (9 km)
... and more
```

### **Custom Routes** (Any origin/destination in Guwahati)
```
Try: "GuwahatiRailway Station" → "Kamakhya Temple"
Try: "Lokhra" → "Fancy Bazaar"
Try: "Tiniali" → "Paltan Bazaar"

All will use Google Maps Distance API
```

---

## 💡 Key Takeaways

✅ **Visual Map** - See the actual route
✅ **Auto-Distance** - Uses Google Maps real distance
✅ **Fast Caching** - Same route twice = instant response
✅ **Smart Rate Limiting** - Prevents API quota errors
✅ **Professional UI** - Interactive, polished appearance
✅ **Error Handling** - Graceful fallbacks if API fails
✅ **Production Ready** - Fully tested and optimized

---

## 🚀 You're Ready to Go!

```powershell
cd "d:\calculator rate"
pnpm dev
# Then open http://localhost:5173 in your browser
```

**Enjoy your enhanced fare calculator with visual map integration!** 🎉

