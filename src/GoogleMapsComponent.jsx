import React, { useState, useCallback, useRef, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { rateLimiter } from "./utils/rateLimiter.js";

// API Call Counter for debugging
let directionsApiCallCount = 0;
window.getDirectionsApiCallCount = () => {
  console.log(`📊 Total Directions API calls this session: ${directionsApiCallCount}`);
  return directionsApiCallCount;
};
window.resetDirectionsApiCallCount = () => {
  directionsApiCallCount = 0;
  console.log("🔄 Directions API call count reset to 0");
};

// IMPORTANT: Keep libraries array outside component to prevent re-renders
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry", "routes"];

const GoogleMapsComponent = ({
  pickupLocation,
  dropoffLocation,
  onDistanceCalculated,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [staticMapUrl, setStaticMapUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trafficLevel, setTrafficLevel] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const inFlightRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  // Track the last successfully rendered route to detect changes
  const lastRouteRef = useRef({ pickup: null, dropoff: null });

  // Main route fetching effect
  useEffect(() => {
    // Guard conditions
    if (!isLoaded || !pickupLocation || !dropoffLocation) {
      console.log("⏸️ Guards not met - map loading or missing location");
      // Clear data when locations are empty
      if (!pickupLocation || !dropoffLocation) {
        setStaticMapUrl(null);
        setRouteInfo(null);
        setTrafficLevel(null);
        setError(null);
      }
      setLoading(false);
      return;
    }

    // Trim locations for comparison
    const trimmedPickup = pickupLocation.trim();
    const trimmedDropoff = dropoffLocation.trim();

    // Check for duplicate origin/destination
    if (trimmedPickup === trimmedDropoff) {
      console.log("⚠️ Origin and destination are the same, skipping");
      setStaticMapUrl(null);
      setRouteInfo(null);
      setError("Origin and destination must be different");
      setTrafficLevel(null);
      return;
    }

    // Check if route has actually changed
    const routeChanged =
      lastRouteRef.current.pickup !== trimmedPickup ||
      lastRouteRef.current.dropoff !== trimmedDropoff;

    // Skip if same route
    if (!routeChanged) {
      console.log("📍 Same route, no need to recalculate");
      return;
    }

    // NEW ROUTE DETECTED - Always fetch fresh directions
    const currentRoute = {
      pickup: trimmedPickup,
      dropoff: trimmedDropoff,
    };
    console.log("🔄 NEW ROUTE - fetching fresh directions:", currentRoute);

    // Prevent concurrent requests
    if (inFlightRef.current) {
      console.log("⏳ Request in flight, skipping");
      return;
    }

    // Check rate limit before making any state changes
    if (!rateLimiter.canMakeRequest("directions")) {
      console.warn("⛔ Rate limited");
      setError("Loading route...");
      setLoading(true);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Retry after rate limit");
        setError(null);
      }, 800);
      return;
    }

    // Clear old data
    console.log("🧹 Clearing old route data");
    setStaticMapUrl(null);
    setRouteInfo(null);
    setError(null);
    setTrafficLevel(null);

    // Make API call
    directionsApiCallCount++;
    console.log(`\n🚀 ═══════════════════════════════════════════`);
    console.log(`🚀 DIRECTIONS API CALL #${directionsApiCallCount}`);
    console.log(`🚀 From: "${currentRoute.pickup}"`);
    console.log(`🚀 To: "${currentRoute.dropoff}"`);
    console.log(`🚀 ═══════════════════════════════════════════\n`);
    inFlightRef.current = true;
    setLoading(true);

    const directionsService = new window.google.maps.DirectionsService();

    console.log("🔍 Request params:", {
      origin: currentRoute.pickup,
      destination: currentRoute.dropoff
    });

    directionsService.route(
      {
        origin: currentRoute.pickup,
        destination: currentRoute.dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Current time for real-time traffic
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        console.log("📊 Response:", status);
        inFlightRef.current = false;
        setLoading(false);

        if (status === window.google.maps.DirectionsStatus.OK) {
          console.log("✅ Success");
          // Update the last route reference
          lastRouteRef.current = { pickup: currentRoute.pickup, dropoff: currentRoute.dropoff };
          setError(null);

          try {
            const route = result.routes[0];
            const leg = route.legs[0];
            if (!leg) throw new Error("Invalid route structure from API");

            // Process route data
            const distance = leg.distance?.value ? leg.distance.value / 1000 : 0;
            const durationNormal = leg.duration?.value ? leg.duration.value / 60 : 0;
            if (durationNormal === 0) throw new Error("Invalid duration data");

            const durationInTraffic = leg.duration_in_traffic
              ? leg.duration_in_traffic.value / 60
              : durationNormal;

            const trafficRatio = durationInTraffic / durationNormal;
            let trafficLevel = "Medium";
            if (trafficRatio < 1.1) {
              trafficLevel = "Low";
            } else if (trafficRatio > 1.3) {
              trafficLevel = "High";
            }

            setTrafficLevel(trafficLevel);
            setRouteInfo({
              distanceText: leg.distance?.text,
              durationText: leg.duration?.text
            });

            // Notify parent
            const resultData = { distance, duration: durationInTraffic, trafficLevel, durationNormal };
            rateLimiter.recordSuccess("directions");
            if (onDistanceCalculated) {
              onDistanceCalculated(resultData);
            }

            // GENERATE STATIC MAP URL
            const polyline = route.overview_polyline;
            // Decode/Encode handled by encodeURIComponent usually, assuming simple string
            const pathParam = `color:0x5438F5|weight:5|enc:${encodeURIComponent(polyline)}`;

            const startLoc = leg.start_location;
            const endLoc = leg.end_location;
            const markers = [
              `color:green|label:A|${startLoc.lat()},${startLoc.lng()}`,
              `color:red|label:B|${endLoc.lat()},${endLoc.lng()}`
            ].map(m => `markers=${m}`).join('&');

            // Construct URL
            const url = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=${pathParam}&${markers}&key=${apiKey}`;
            setStaticMapUrl(url);

          } catch (parseError) {
            console.error("❌ Error parsing route data:", parseError);
            setError("Invalid route data received");
            setStaticMapUrl(null);
            setTrafficLevel(null);
          }
        } else {
          console.error("❌ Error:", status);
          if (status === window.google.maps.DirectionsStatus.INVALID_REQUEST) {
            setError("Invalid locations. Try entering full addresses.");
          } else if (status === window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
            rateLimiter.recordError("directions", 429);
            setError("API limit, retrying...");
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              console.log("🔄 Retry after API limit");
              setError(null);
            }, 1500);
          } else if (status === window.google.maps.DirectionsStatus.NOT_FOUND) {
            setError("Route not found");
          } else if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
            setError("No route available");
          } else {
            setError(`Error: ${status}`);
          }
          setStaticMapUrl(null);
          setTrafficLevel(null);
        }
      }
    );

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [isLoaded, pickupLocation, dropoffLocation, onDistanceCalculated]);

  // Render Logic

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 rounded-3xl bg-zinc-50 border border-zinc-200/80">
        <div className="text-center">
          {!apiKey ? (
            <>
              <div className="text-sm text-red-600 font-semibold">❌ API Key Missing</div>
              <div className="mt-2 text-xs text-red-500">Set VITE_GOOGLE_MAPS_API_KEY in .env file</div>
            </>
          ) : (
            <>
              <div className="text-sm text-zinc-600">Loading Map API...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-zinc-200/80 shadow-lg bg-zinc-50">
      <div className="relative w-full h-[400px] bg-zinc-100 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <div className="text-sm text-blue-600 font-semibold animate-pulse">⏳ Calculating Route...</div>
          </div>
        )}

        {staticMapUrl ? (
          <img
            src={staticMapUrl}
            alt="Route Map"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-zinc-400 text-sm p-4 text-center">
            {error ? (
              <span className="text-red-500">⚠️ {error}</span>
            ) : (
              "📍 Enter pickup and dropoff to view route"
            )}
          </div>
        )}
      </div>

      {/* Status Footer */}
      {(routeInfo || error) && (
        <div className="bg-white border-t border-zinc-200/80 px-4 py-3 space-y-2">
          {error && !staticMapUrl && (
            <div className="text-xs text-amber-600">⚠️ {error}</div>
          )}

          {routeInfo && (
            <div className="space-y-2 text-xs">
              <div className="text-green-600 font-semibold">✅ Route ready</div>
              <div className="text-zinc-600">
                📍 <span className="font-medium">{pickupLocation}</span> → <span className="font-medium">{dropoffLocation}</span>
              </div>
              <div className="text-zinc-700 font-semibold">
                {routeInfo.distanceText} • {routeInfo.durationText}
              </div>
              {trafficLevel && (
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/50">
                  <span className="text-zinc-600 font-semibold">Live Traffic:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${trafficLevel === "Low"
                        ? "bg-green-100 text-green-700"
                        : trafficLevel === "High"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                    {trafficLevel === "Low" && "🟢 Low"}
                    {trafficLevel === "Medium" && "🟡 Medium"}
                    {trafficLevel === "High" && "🔴 High"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsComponent;
