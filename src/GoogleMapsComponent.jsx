import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  TrafficLayer,
  Marker,
} from "@react-google-maps/api";
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

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: 26.1445, // Guwahati coordinates
  lng: 91.7362,
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

  const [map, setMap] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trafficLevel, setTrafficLevel] = useState(null);
  // Unique key to force DirectionsRenderer remount when route changes
  const [routeKey, setRouteKey] = useState(0);
  // Flag to control DirectionsRenderer visibility during route change
  const [showRoute, setShowRoute] = useState(false);
  
  const inFlightRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const directionsRendererRef = useRef(null);
  // Track the last successfully rendered route to detect changes
  const lastRouteRef = useRef({ pickup: null, dropoff: null });

  const onLoad = useCallback((mapInstance) => {
    console.log("✅ Map loaded successfully");
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    console.log("🗺️ Map unmounted");
    // Remove directions renderer from map when unmounting
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setShowRoute(false);
    setMap(null);
  }, []);

  // Main route fetching effect
  useEffect(() => {
    // Guard conditions
    if (!isLoaded || !map || !pickupLocation || !dropoffLocation) {
      console.log("⏸️ Guards not met - map loading or missing location");
      // Hide and clear the route when locations are empty
      setShowRoute(false);
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      setDirectionsResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Trim locations for comparison
    const trimmedPickup = pickupLocation.trim();
    const trimmedDropoff = dropoffLocation.trim();
    
    // BUG #6 FIX: Check for duplicate origin/destination
    if (trimmedPickup === trimmedDropoff) {
      console.log("⚠️ Origin and destination are the same, skipping");
      // Hide and clear old route
      setShowRoute(false);
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      setDirectionsResult(null);
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

    // CRITICAL: Hide old route and remove DirectionsRenderer from map BEFORE new request
    console.log("🧹 Clearing old route from map");
    setShowRoute(false);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setDirectionsResult(null);
    setError(null);
    setTrafficLevel(null);
    // Increment route key to force DirectionsRenderer remount
    setRouteKey(prev => prev + 1);
    
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

    // Always fetch a fresh route for the current pickup/drop; no cached geometry.
    directionsService.route(
      {
        origin: currentRoute.pickup,
        destination: currentRoute.dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        console.log("📊 Response:", status);
        inFlightRef.current = false;
        setLoading(false);

        if (status === window.google.maps.DirectionsStatus.OK) {
          console.log("✅ Success");
          // Update the last route reference
          lastRouteRef.current = { pickup: currentRoute.pickup, dropoff: currentRoute.dropoff };
          setDirectionsResult(result);
          setShowRoute(true); // Show the new route
          setError(null);

          try {
            const leg = result.routes[0]?.legs[0];
            if (!leg) {
              throw new Error("Invalid route structure from API");
            }

            // BUG #5 FIX: Add error boundary for missing data
            const distance = leg.distance?.value ? leg.distance.value / 1000 : 0;
            const durationNormal = leg.duration?.value ? leg.duration.value / 60 : 0;
            if (durationNormal === 0) {
              throw new Error("Invalid duration data");
            }

            const durationInTraffic = leg.duration_in_traffic
              ? leg.duration_in_traffic.value / 60
              : durationNormal;            const trafficRatio = durationInTraffic / durationNormal;
            let trafficLevel = "Medium";
            if (trafficRatio < 1.1) {
              trafficLevel = "Low";
              console.log("🟢 Low");
            } else if (trafficRatio > 1.3) {
              trafficLevel = "High";
              console.log("🔴 High");
            } else {
              console.log("🟡 Medium");
            }

            setTrafficLevel(trafficLevel);

            // BUG #1 FIX: Ensure correct callback data structure
            const resultData = { distance, duration: durationInTraffic, trafficLevel, durationNormal };
            // Directions caching disabled - always fetch fresh geometry
            // apiCache.set("directions", currentRoute.pickup, currentRoute.dropoff, resultData);
            rateLimiter.recordSuccess("directions");
            if (onDistanceCalculated) {
              onDistanceCalculated(resultData);
            }

            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].legs.forEach((leg) => {
              bounds.extend(leg.start_location);
              bounds.extend(leg.end_location);
            });
            map.fitBounds(bounds);
          } catch (parseError) {
            console.error("❌ Error parsing route data:", parseError);
            setError("Invalid route data received");
            setDirectionsResult(null);
            setTrafficLevel(null);
          }
        } else {
          console.error("❌ Error:", status);
          if (status === window.google.maps.DirectionsStatus.INVALID_REQUEST) {
            setError("Invalid locations. Try entering full addresses.");
            console.error("Invalid request details:", { origin: currentRoute.pickup, destination: currentRoute.dropoff });
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
          setDirectionsResult(null);
          setTrafficLevel(null);
        }
      }
    );

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [isLoaded, map, pickupLocation, dropoffLocation, onDistanceCalculated]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 rounded-3xl bg-zinc-50 border border-zinc-200/80">
        <div className="text-center">
          {!apiKey ? (
            <>
              <div className="text-sm text-red-600 font-semibold">❌ API Key Missing</div>
              <div className="mt-2 text-xs text-red-500">Set VITE_GOOGLE_MAPS_API_KEY in .env file</div>
            </>
          ) : (
            <>
              <div className="text-sm text-zinc-600">Loading Google Maps...</div>
              <div className="mt-2 text-xs text-zinc-400">Please wait...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-zinc-200/80 shadow-lg">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {/* Live traffic overlay */}
        <TrafficLayer />
        
        {showRoute && directionsResult && (
          // Only render when showRoute is true - prevents old routes from persisting
          <DirectionsRenderer
            key={`route-${routeKey}`}
            directions={directionsResult}
            onLoad={(renderer) => {
              // Clear any previous renderer first
              if (directionsRendererRef.current && directionsRendererRef.current !== renderer) {
                directionsRendererRef.current.setMap(null);
              }
              directionsRendererRef.current = renderer;
              console.log("📍 DirectionsRenderer loaded");
            }}
            onUnmount={() => {
              // Remove from map when unmounting
              if (directionsRendererRef.current) {
                directionsRendererRef.current.setMap(null);
                directionsRendererRef.current = null;
              }
              console.log("📍 DirectionsRenderer unmounted");
            }}
            options={{
              polylineOptions: {
                strokeColor: "#5438F5",
                strokeWeight: 4,
                strokeOpacity: 0.9,
              },
              suppressMarkers: true,
              preserveViewport: false,
            }}
          />
        )}
        
        {showRoute && directionsResult && (() => {
          // Hide default markers and show only one A/B for current route.
          const firstLeg = directionsResult?.routes[0]?.legs[0];
          const lastLeg =
            directionsResult?.routes[0]?.legs[directionsResult.routes[0].legs.length - 1];
          
          return (
            <>
              {firstLeg && (
                <Marker
                  position={firstLeg.start_location}
                  label={{
                    text: "A",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "white",
                    className: "bg-green-600 rounded-full w-8 h-8 flex items-center justify-center",
                  }}
                  title={pickupLocation}
                />
              )}
              {lastLeg && (
                <Marker
                  position={lastLeg.end_location}
                  label={{
                    text: "B",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "white",
                    className: "bg-red-600 rounded-full w-8 h-8 flex items-center justify-center",
                  }}
                  title={dropoffLocation}
                />
              )}
            </>
          );
        })()}
      </GoogleMap>

      {/* Status Footer */}
      <div className="bg-white border-t border-zinc-200/80 px-4 py-3 space-y-2">
        {loading && (
          <div className="text-xs text-blue-600 font-semibold">⏳ Fetching route...</div>
        )}
        {error && (
          <div className="text-xs text-amber-600">⚠️ {error}</div>
        )}
        {!loading && !error && directionsResult && (
          <div className="space-y-2 text-xs">
            <div className="text-green-600 font-semibold">✅ Route ready</div>
            <div className="text-zinc-600">
              📍 <span className="font-medium">{pickupLocation}</span> → <span className="font-medium">{dropoffLocation}</span>
            </div>
            <div className="text-zinc-700 font-semibold">
              {directionsResult.routes[0]?.legs[0]?.distance?.text} • {directionsResult.routes[0]?.legs[0]?.duration?.text}
            </div>
            {trafficLevel && (
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/50">
                <span className="text-zinc-600 font-semibold">Live Traffic:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    trafficLevel === "Low"
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
        {!loading && !error && !directionsResult && (
          <div className="text-xs text-zinc-400">
            📍 Enter origin and destination to view route
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapsComponent;
