# AiravatL Fare Calculator - Google Maps API Analysis & Implementation

## 🎯 Project Understanding

### **What is AiravatL?**
AiravatL is a **delivery/transport logistics fare calculator** app for **Guwahati city intracity deliveries**.

### **Purpose of Google Maps API**
The Google Maps API is used to:
1. **Calculate real-time distances** between pickup and dropoff locations
2. **Detect traffic conditions** (Low/Medium/High) based on actual travel duration
3. **Auto-populate traffic multiplier** based on current traffic state
4. **Provide live routes** for accurate fare estimation

---

## 📊 Current Distance Calculation Logic

### **Hierarchy (Priority Order)**
```
1. ✅ Google Maps API Distance (HIGHEST PRIORITY)
   ├─ Live actual distance from API
   ├─ Includes traffic in duration
   └─ Used for final fare calculation

2. ⚪ OD Matrix (Predefined distances) (FALLBACK)
   ├─ Static distances between known locations
   ├─ Covers: Ulubari, Panbazar, Ganeshguri, Beltola, Jalukbari, Six Mile
   └─ Used if API distance unavailable

3. 📝 Manual Distance Override (LAST RESORT)
   ├─ User-entered: Base Distance + Extra Distance
   └─ Only used when no OD matrix or API data
```

### **Code Location**
```javascript
// src/AiravatLFareCalculatorPreview.jsx, lines 422-430
const manualDistance = toNum(baseKm) + toNum(extraKm);
const odDistance = getODDistance(origin, destination);
const effectiveKm = apiDistanceKm && apiDistanceKm > 0 
  ? apiDistanceKm                    // API distance (PRIORITY 1)
  : odDistance || manualDistance;    // Fallback to OD matrix, then manual
```

---

## 💰 Fare Calculation Formula

```
Final Fare = (Base Fare + Distance Fare + Additional Charges) × Multipliers + Commission

Where:
- Base Fare = Vehicle-specific base (₹150-₹500)
- Distance Fare = Distance (km) × ₹30/km
- Additional Charges = Waiting charges + Stop charges + Loading charges
- Multipliers = Traffic × Vehicle × Condition
- Commission = 15% of (Subtotal × Multipliers)

Example:
Distance: 3.5 km (from Google Maps)
Vehicle: 3 Wheeler (₹150 base, 1.0x multiplier)
Traffic: Medium (1.0x multiplier from API detection)
Condition: New (1.0x multiplier)

Base Fare: ₹150
Distance Fare: 3.5 × ₹30 = ₹105
Subtotal: ₹255
Combined Multiplier: 1.0 × 1.0 × 1.0 = 1.0
Before Commission: ₹255 × 1.0 = ₹255
Commission (15%): ₹38.25
FINAL FARE: ₹293.25
```

---

## 🌐 How Google Maps API Integrates

### **Current Implementation**
```
Origin/Destination Input
        ↓
2-second Debounce (waits for user to stop typing)
        ↓
TrafficMap Component (Distance Matrix API)
        ↓
Check Cache (5-min TTL)
        ├─ Hit: Use cached result
        └─ Miss: Make API call
        ↓
Rate Limiter Check
├─ Can't make request? Wait with exponential backoff
└─ Can make request? Continue
        ↓
Fetch Distance & Duration with Traffic
        ↓
Detect Traffic Level from ratio: duration_in_traffic / duration_base
├─ Ratio < 1.1 = Low traffic (0.95x multiplier)
├─ Ratio 1.1-1.3 = Medium traffic (1.0x multiplier)
└─ Ratio > 1.3 = High traffic (1.2x multiplier)
        ↓
Cache Result
        ↓
Pass Data to Main Calculator
├─ Distance → Used in fare calculation
├─ Traffic Level → Auto-populate traffic selector
└─ Duration → Display for user info
        ↓
Fare Recalculated Automatically
```

### **Key File: TrafficMap Component**
Location: `src/AiravatLFareCalculatorPreview.jsx` (lines 135-380)

**What it does:**
- Calls Google Distance Matrix API
- Extracts: distance, duration, duration_in_traffic
- Calculates traffic level from duration ratio
- Caches results for 5 minutes
- Implements rate limiting (2s between requests, 25 requests/min)

---

## 🔌 API Endpoint Used

### **Google Distance Matrix API**
```
Endpoint: https://maps.googleapis.com/maps/api/distancematrix/json

Query Parameters:
- origins: "Ulubari, Guwahati"
- destinations: "Panbazar, Guwahati"
- mode: "driving"
- departure_time: "now" (includes real-time traffic)
- key: YOUR_API_KEY

Response:
{
  rows: [{
    elements: [{
      distance: { value: 3500 },          // meters
      duration: { value: 480 },           // seconds (base)
      duration_in_traffic: { value: 600 } // seconds (with traffic)
    }]
  }]
}
```

---

## ✅ What's Currently Working

1. **API Key Setup** ✅
   - Stored in `.env` file
   - Exposed to window object in `main.jsx`
   - Available to component

2. **Rate Limiting** ✅
   - 2 second minimum between requests
   - 25 requests/minute limit
   - Exponential backoff on errors
   - 5-minute cache TTL

3. **Distance Extraction** ✅
   - Calculates in kilometers
   - Converts from meters properly

4. **Traffic Detection** ✅
   - Compares traffic vs base duration
   - Classifies into Low/Medium/High

5. **Fare Integration** ✅
   - Distance flows to fare calculation
   - Traffic multiplier applied
   - Final fare displays

---

## 🔧 Proper Usage Pattern

### **When API Should Be Called**
✅ Origin or destination changes
✅ User has entered both fields
✅ 2 seconds after user stops typing
✅ Not already in cache
✅ Not rate limited

### **When API Should NOT Be Called**
❌ Same location entered twice
❌ Within 2-second debounce window
❌ Rate limit hit → wait with backoff
❌ API key missing
❌ Missing origin or destination

### **Expected User Flow**
```
1. User types "Ulubari" in Origin
   └─ No API call (incomplete)

2. After 2 seconds of typing pause
   └─ Still no API call (destination missing)

3. User types "Panbazar" in Destination
   └─ No API call (too recent)

4. After 2 seconds of pause
   └─ ✅ API call made
   └─ Distance: 3.5 km
   └─ Traffic: Medium
   └─ Fare: ₹293

5. User keeps same origin/destination
   └─ ✅ Cache hit (no API call)
   └─ Instant response

6. User changes to "Ganeshguri"
   └─ Wait 2 seconds
   └─ ✅ API call for new route
```

---

## 🎯 How to Use the API Properly

### **Configuration (Already Done)**
```javascript
// .env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCfmNvhBpEH3QqxyusdEWpqWnXRKTOwiUU

// src/main.jsx
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

// src/AiravatLFareCalculatorPreview.jsx
<TrafficMap
  originLabel={routeOrigin}
  destinationLabel={routeDestination}
  onRouteChange={({ distanceKm, durationMin, trafficLevel }) => {
    setApiDistanceKm(distanceKm);           // Store API distance
    setApiDurationMin(durationMin);         // Store duration (info)
    if (!lockLiveTraffic) {
      setTraffic(trafficLevel);             // Auto-set traffic level
    }
  }}
/>
```

### **Flow in Fare Calculation**
```javascript
// Distance calculation
const effectiveKm = apiDistanceKm && apiDistanceKm > 0 
  ? apiDistanceKm              // USE API DISTANCE
  : odDistance || manualDistance;

// Traffic multiplier (from API detection)
const trafficMult = CONFIG.traffic[traffic] || 1;  // 0.95, 1.0, or 1.2

// Fare calculation
const distanceFare = effectiveKm * CONFIG.perKm;   // Distance × ₹30
const beforeCommission = subtotal * trafficMult * vehicleMult * conditionMult;
const commission = beforeCommission * CONFIG.commissionRate;
const finalFare = beforeCommission + commission;
```

---

## 📈 Complete Data Flow

```
User Input (Origin/Destination)
            ↓
2-sec Debounce (waits for typing pause)
            ↓
TrafficMap Component Receives Props
            ↓
maybeCallApi() Callback Triggered
            ↓
┌─ Check if request already in flight
├─ Check if origin/destination empty
├─ Check if API key configured
├─ Check if same as last request
│
├─ CHECK CACHE FIRST
│  ├─ Cache Hit → Return cached {distance, duration, trafficLevel}
│  └─ Cache Miss → Continue to step below
│
├─ CHECK RATE LIMITER
│  ├─ Can't request? → Show "Rate limited", schedule retry with backoff
│  └─ Can request? → Continue
│
├─ FETCH FROM GOOGLE MAPS API
│  ├─ Extract: distance_value, duration_value, duration_in_traffic_value
│  ├─ Calculate: distanceKm = distance_value / 1000
│  ├─ Calculate: trafficLevel from ratio
│  └─ Create: result = {distanceKm, durationMin, trafficLevel}
│
├─ CACHE RESULT (5-min TTL)
│
├─ RECORD SUCCESS (update quota counter)
│
└─ PASS TO PARENT COMPONENT via onRouteChange callback
            ↓
Parent Component (AiravatLFareCalculatorPreview)
            ├─ setApiDistanceKm(distanceKm)
            ├─ setApiDurationMin(durationMin)
            └─ setTraffic(trafficLevel)  [if not locked]
            ↓
effectiveKm = apiDistanceKm (PRIORITY 1)
            ↓
Fare Recalculates:
  distance Fare = effectiveKm × ₹30
  beforeCommission = (subtotal) × (traffic × vehicle × condition multipliers)
  finalFare = beforeCommission + commission
            ↓
UI Updates with Final Fare
```

---

## 🚀 How to Test Proper Implementation

### **Test Case 1: API Distance Used**
```
1. Enter Origin: "Ulubari"
2. Enter Destination: "Panbazar"
3. Wait 2 seconds
4. Check Console:
   ✅ "📡 Fetching route from Google Maps..."
   ✅ "✅ Route fetched successfully: {distanceKm: 3.5, ...}"
5. Verify:
   ✅ "Trip Distance" shows API value (3.5 km, not manual)
   ✅ "API Calls: 1" counter increases
6. Fare calculation uses 3.5 km
```

### **Test Case 2: Cache Working**
```
1. Keep same Origin/Destination
2. After 5+ minutes, change and then change back
3. Within 5 min, should see cached value
4. Check Console:
   ✅ "✅ Cache hit! Using cached result: ..."
   ✅ "API Calls" doesn't increase
```

### **Test Case 3: Traffic Detection**
```
Morning (peak): Should detect High traffic
Midnight: Should detect Low traffic
Midday: Should detect Medium traffic

Verify:
- Traffic Multiplier updates correctly
- Fare increases/decreases with traffic
- "Live distance: X km · Traffic: Low/Medium/High" displays
```

### **Test Case 4: Manual Fallback**
```
1. Enter non-existent location: "XYZ Place"
2. If API can't find it, should fall back to manual distance
3. Check: Manual distance input field used
4. Verify: Fare calculated with manual distance
```

---

## ✨ Summary: Proper Google Maps API Usage

| Aspect | Status | Details |
|--------|--------|---------|
| API Key | ✅ Ready | Stored in .env, exposed to window |
| Distance Matrix API | ✅ Active | Called via Google Distance Matrix |
| Caching | ✅ Active | 5-min TTL, LRU eviction |
| Rate Limiting | ✅ Active | 2s min, 25/min, exponential backoff |
| Distance Extraction | ✅ Working | Converts meters to km |
| Traffic Detection | ✅ Working | Classifies Low/Medium/High |
| Fare Integration | ✅ Working | API distance prioritized |
| Fallback Logic | ✅ Working | API → OD Matrix → Manual |
| Debugging | ✅ Active | Emoji-tagged console logs |

The Google Maps API is properly integrated for **real-time distance and traffic-aware fare calculation**.

