# Google Maps API Integration Guide

## ✅ Setup Complete!

Your project is now configured to use Google Maps API. Here's what was done:

### 1. **Installation**
- Added `@react-google-maps/api` package to your project
- All dependencies installed via pnpm

### 2. **API Key Configuration**
- API Key stored in `.env` file as `VITE_GOOGLE_MAPS_API_KEY`
- Environment variable properly exposed in Vite config
- Securely referenced in components

### 3. **Google Maps Component Created**
- New file: `src/GoogleMapsComponent.jsx`
- Includes:
  - Interactive map display
  - Directions rendering (pickup → dropoff)
  - Auto-calculated distance & duration
  - Tailwind CSS styling

---

## 📍 How to Use

### Basic Integration in Your Calculator

```jsx
import GoogleMapsComponent from "./GoogleMapsComponent";

// In your AiravatLFareCalculatorPreview component:
const [pickupLocation, setPickupLocation] = useState("Ulubari, Guwahati");
const [dropoffLocation, setDropoffLocation] = useState("Panbazar, Guwahati");
const [distance, setDistance] = useState(0);

<GoogleMapsComponent
  pickupLocation={pickupLocation}
  dropoffLocation={dropoffLocation}
  onDistanceCalculated={({ distance, duration }) => {
    setDistance(distance);
    // Use distance for real fare calculation
  }}
/>
```

---

## 🎯 Available Features

### GoogleMapsComponent Props:
- **pickupLocation** (string): Address or coordinates for pickup
- **dropoffLocation** (string): Address or coordinates for dropoff
- **onDistanceCalculated** (function): Callback with `{distance (km), duration (min)}`

### Map Features:
- ✅ Directions rendering between two points
- ✅ Automatic distance & duration calculation
- ✅ Auto-fit map bounds to route
- ✅ Clean UI with minimal controls
- ✅ Works with addresses and coordinates

---

## 🔌 Coordinate Format Support

The component accepts multiple formats:

```javascript
// Address string
"Ulubari, Guwahati, Assam"

// Coordinates object
{ lat: 26.1445, lng: 91.7362 }

// Lat/Lng string
"26.1445,91.7362"
```

---

## 📊 Integration with Your Fare Calculator

You can now replace the hardcoded `odMatrix` with real Google Maps distances:

```javascript
// Before: Using hardcoded distance matrix
const distance = CONFIG.odMatrix[pickup][dropoff];

// After: Using calculated distance from Google Maps
const distance = mapCalculatedDistance; // In km
const fare = distance * CONFIG.perKm + CONFIG.baseFare;
```

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: Your API key is visible in the browser. It's recommended to:

1. **Add API Key restrictions** in Google Cloud Console:
   - Go to Credentials → Your Key
   - Add HTTP referrer restrictions to your domain
   - Restrict to only Maps, Routes, and Places APIs

2. **Set usage limits** to prevent unexpected charges:
   - Set quotas in Google Cloud Console
   - Monitor usage in the API dashboard

3. **For Production**:
   - Consider using a backend proxy to hide the key
   - Implement server-side API calls

---

## 🚀 Next Steps

1. **Run your development server**:
   ```
   pnpm dev
   ```

2. **Import and use in your calculator**:
   ```jsx
   import GoogleMapsComponent from "./GoogleMapsComponent";
   ```

3. **Update your location inputs** to pass real addresses or coordinates

4. **Remove hardcoded distances** from `odMatrix` and replace with calculated values

---

## 📚 Useful Resources

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Docs](https://react-google-maps-api-docs.netlify.app/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🐛 Troubleshooting

**Map not showing?**
- Check browser console for errors
- Verify API key is correct in `.env`
- Ensure API is enabled in Google Cloud Console

**Distance not calculating?**
- Verify addresses are valid and specific
- Check that both pickup and dropoff locations are provided
- Look for DirectionsService status codes in console

**API Key errors?**
- API might not have required permissions
- Check API restrictions in Google Cloud Console
- Ensure Maps SDK for JavaScript is enabled
