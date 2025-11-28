# Trigger-Based Route Calculation Plan

## Problem Statement

Currently, the Google Maps Directions API is called **every time the user types** in the origin or destination fields. This happens because:

```javascript
// Current behavior in AiravatLFareCalculatorPreview.jsx
useEffect(() => {
  if (!origin || !destination) return;
  // Update map locations immediately for instant feedback
  setRouteOrigin(origin); // ← Triggers on every keystroke!
  setRouteDestination(destination);
}, [origin, destination]);
```

This causes:

- **Excessive API calls** during typing
- **Wasted API costs** for incomplete/abandoned searches
- **Multiple route calculations** before user finishes entering locations

---

## Current Flow (Expensive)

```
User types "Guwa" → origin state updates
                  ↓
useEffect triggers → setRouteOrigin("Guwa")
                  ↓
GoogleMapsComponent receives new pickupLocation
                  ↓
Directions API call #1 (fails or returns wrong result)

User types "Guwahati" → origin state updates
                  ↓
useEffect triggers → setRouteOrigin("Guwahati")
                  ↓
GoogleMapsComponent receives new pickupLocation
                  ↓
Directions API call #2 (still incomplete)

... continues for every keystroke ...
```

**Result:** 10-20 API calls for entering a single route!

---

## Proposed Solution: Trigger-Based Calculation

Only calculate the route when:

1. **User selects a location from suggestions dropdown**, OR
2. **User clicks "Calculate Route" button**, OR
3. **User presses Enter** after typing

### New Flow (Cost-Optimized)

```
User types "Guwahati Railway" → origin state updates (no API call)
                              ↓
Autocomplete shows suggestions (local first, then API after 1.5s)
                              ↓
User clicks suggestion OR clicks "Calculate Route"
                              ↓
confirmedOrigin/confirmedDestination updates
                              ↓
GoogleMapsComponent receives confirmed locations
                              ↓
SINGLE Directions API call with final locations
```

---

## Implementation Plan

### Phase 1: Add Confirmed Location State

**File:** `AiravatLFareCalculatorPreview.jsx`

```javascript
// Current states (for typing/display)
const [origin, setOrigin] = useState("");
const [destination, setDestination] = useState("");

// NEW: Confirmed states (for map/calculation)
const [confirmedOrigin, setConfirmedOrigin] = useState("");
const [confirmedDestination, setConfirmedDestination] = useState("");
const [routeConfirmed, setRouteConfirmed] = useState(false);
```

### Phase 2: Update Location Selection Handlers

**File:** `AiravatLFareCalculatorPreview.jsx`

```jsx
<LocationAutocomplete
  value={origin}
  onChange={setOrigin} // Just updates display, no API call
  onSelect={(place) => {
    // User selected from dropdown → confirm location
    setConfirmedOrigin(place.fullAddress);
    console.log("📍 Origin CONFIRMED:", place);
  }}
  label="Origin"
  placeholder="Enter origin..."
/>
```

### Phase 3: Add "Calculate Route" Button

**File:** `AiravatLFareCalculatorPreview.jsx`

Add a button between the location inputs and the map:

```jsx
<div className="mt-4 flex items-center gap-3">
  <button
    onClick={handleCalculateRoute}
    disabled={!origin || !destination || isCalculating}
    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 
               text-white font-semibold shadow-lg hover:shadow-xl 
               disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  >
    {isCalculating ? "Calculating..." : "📍 Calculate Route"}
  </button>

  {routeConfirmed && (
    <span className="text-xs text-green-600 font-medium">
      ✅ Route calculated
    </span>
  )}
</div>
```

### Phase 4: Calculate Route Handler

```javascript
const handleCalculateRoute = useCallback(() => {
  if (!origin.trim() || !destination.trim()) {
    console.warn("Origin or destination missing");
    return;
  }

  // Confirm both locations
  setConfirmedOrigin(origin.trim());
  setConfirmedDestination(destination.trim());
  setRouteConfirmed(true);

  console.log("🚀 Route calculation triggered:", { origin, destination });
}, [origin, destination]);
```

### Phase 5: Update GoogleMapsComponent Binding

Only pass **confirmed** locations to the map:

```jsx
<GoogleMapsComponent
  pickupLocation={confirmedOrigin} // Changed from routeOrigin
  dropoffLocation={confirmedDestination} // Changed from routeDestination
  onDistanceCalculated={({ distance, duration, trafficLevel }) => {
    setApiDistanceKm(distance);
    setApiDurationMin(duration);
    if (!lockLiveTraffic && trafficLevel) {
      setTraffic(trafficLevel);
    }
  }}
/>
```

### Phase 6: Remove Auto-Trigger useEffect

**DELETE or modify this:**

```javascript
// REMOVE THIS - it causes auto-triggering on every keystroke
useEffect(() => {
  if (!origin || !destination) return;
  setRouteOrigin(origin);
  setRouteDestination(destination);
}, [origin, destination]);
```

### Phase 7: Update Reset Function

```javascript
onClick={() => {
  // Reset display states
  setOrigin(CONFIG.odLocations[0]);
  setDestination(CONFIG.odLocations[1]);

  // Reset confirmed states
  setConfirmedOrigin("");
  setConfirmedDestination("");
  setRouteConfirmed(false);

  // Reset calculation results
  setApiDistanceKm(null);
  setApiDurationMin(null);
  // ... rest of reset
}}
```

---

## Visual Design for Calculate Route Section

```
┌─────────────────────────────────────────────────────────────┐
│  Route (Origin & Destination)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │ 🔍 Origin           │   │ 🔍 Destination      │         │
│  │ Guwahati Railway... │   │ Beltola, Guwahati   │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ┌──────────────────────┐                                   │
│  │ 📍 Calculate Route   │  ✅ Route calculated              │
│  └──────────────────────┘                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [Google Map with Route]                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Live distance: 8.2 km · Estimated time: 25 min           │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Savings Analysis

### Before (Current)

- User types 20 characters in origin: ~5 API calls (with current debounce)
- User types 20 characters in destination: ~5 API calls
- **Total: ~10 Directions API calls per route entry**

### After (Trigger-Based)

- User types in origin: 0 Directions API calls (only autocomplete)
- User types in destination: 0 Directions API calls
- User clicks "Calculate Route": 1 Directions API call
- **Total: 1 Directions API call per route entry**

### Savings

- **90% reduction in Directions API calls**
- Combined with autocomplete optimizations: **~95% total cost reduction**

---

## Edge Cases & UX Considerations

### 1. Auto-Calculate on Selection

When user selects from dropdown for BOTH origin and destination:

```javascript
// In onSelect callback
if (confirmedOrigin && confirmedDestination) {
  // Optional: Auto-calculate when both are selected from suggestions
  handleCalculateRoute();
}
```

### 2. Visual Feedback

- Show "pending" state when locations differ from confirmed
- Show "calculating" spinner on button during API call
- Show "recalculate" hint when user changes confirmed location

### 3. Keyboard Support

- Enter key in destination field triggers calculation
- Escape clears and resets

### 4. Initial Load

- Don't auto-calculate on page load
- Show placeholder map with default center (Guwahati)
- Prompt user to enter locations

---

## Files to Modify

| File                                | Changes                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `AiravatLFareCalculatorPreview.jsx` | Add confirmed states, calculate button, update handlers |
| `LocationAutocomplete.jsx`          | Add optional onEnterPress callback                      |
| `GoogleMapsComponent.jsx`           | (No changes needed - already handles empty locations)   |

---

## Implementation Timeline

| Step      | Task                                          | Estimated Time |
| --------- | --------------------------------------------- | -------------- |
| 1         | Add confirmed location states                 | 10 min         |
| 2         | Update LocationAutocomplete onSelect handlers | 10 min         |
| 3         | Add "Calculate Route" button with styling     | 15 min         |
| 4         | Implement handleCalculateRoute function       | 10 min         |
| 5         | Update GoogleMapsComponent bindings           | 5 min          |
| 6         | Remove auto-trigger useEffect                 | 5 min          |
| 7         | Update Reset function                         | 5 min          |
| 8         | Testing & edge cases                          | 15 min         |
| **Total** |                                               | **~75 min**    |

---

## Success Metrics

After implementation, verify:

- [ ] No Directions API call while typing
- [ ] Single API call on "Calculate Route" click
- [ ] Single API call on suggestion selection (if auto-calculate enabled)
- [ ] Map shows placeholder until route is calculated
- [ ] Route clears and recalculates on new locations
- [ ] Reset button clears confirmed state

---

## Optional Enhancements

1. **Auto-calculate when both selected from suggestions**

   - Good UX for power users
   - Still saves API calls vs current behavior

2. **"Recalculate" indicator**

   - Show when typed location differs from confirmed
   - Prompt user to recalculate

3. **Keyboard shortcut**

   - Ctrl+Enter to calculate from anywhere in form

4. **Remember last route**
   - Store in localStorage
   - Pre-populate on return visit
