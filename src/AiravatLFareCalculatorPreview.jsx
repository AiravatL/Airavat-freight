import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { rateLimiter } from "./utils/rateLimiter.js";
import { apiCache } from "./utils/apiCache.js";
import GoogleMapsComponent from "./GoogleMapsComponent.jsx";
import LocationAutocomplete from "./components/LocationAutocomplete.jsx";
import { useAuth } from "./context/AuthContext";

export const PRICING_CONFIG = {
  baseFare: 200,
  perKm: 30,
  waitPerMin: 2,
  stopCharge: 50,
  commissionRate: 0.15,
  traffic: {
    Low: 0.95,
    Medium: 1.0,
    High: 1.2,
  },
  vehicle: {
    "3 Wheeler - 500kg": 1.0,
    "Intra - 1 Ton": 1.25,
    "Bolero Pickup - 2 Ton": 1.55,
    "Tata 407 - 4 Ton": 2.0,
  },
  vehicleBaseFare: {
    "3 Wheeler - 500kg": 150,
    "Intra - 1 Ton": 250,
    "Bolero Pickup - 2 Ton": 350,
    "Tata 407 - 4 Ton": 500,
  },
  condition: {
    New: 1.0,
    Mid: 1.05,
    Old: 1.1,
  },
  odLocations: [
    "Ulubari",
    "Panbazar",
    "Ganeshguri",
    "Beltola",
    "Jalukbari",
    "Six Mile",
  ],
  odMatrix: {
    Ulubari: {
      Panbazar: 3.5,
      Ganeshguri: 3.5,
      Beltola: 6,
      Jalukbari: 8,
      "Six Mile": 6,
    },
    Panbazar: {
      Ulubari: 3.5,
      Ganeshguri: 6,
      Beltola: 8.5,
      Jalukbari: 7,
      "Six Mile": 9,
    },
    Ganeshguri: {
      Ulubari: 3.5,
      Panbazar: 6,
      Beltola: 4,
      Jalukbari: 10,
      "Six Mile": 3,
    },
    Beltola: {
      Ulubari: 6,
      Panbazar: 8.5,
      Ganeshguri: 4,
      Jalukbari: 13,
      "Six Mile": 5,
    },
    Jalukbari: {
      Ulubari: 8,
      Panbazar: 7,
      Ganeshguri: 10,
      Beltola: 13,
      "Six Mile": 12,
    },
    "Six Mile": {
      Ulubari: 6,
      Panbazar: 9,
      Ganeshguri: 3,
      Beltola: 5,
      Jalukbari: 12,
    },
  },
};

const CONFIG = PRICING_CONFIG;

const InfoIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zM10 6a1 1 0 100 2 1 1 0 000-2z"
      clipRule="evenodd"
    />
  </svg>
);

const StatRow = ({ label, value, highlight = false, tooltip = "" }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-zinc-700">{label}</span>
      {tooltip && (
        <div className="relative group">
          <InfoIcon />
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block z-20 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 shadow-lg">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    <span
      className={`text-sm ${
        highlight ? "text-purple-600 font-semibold" : "text-zinc-900"
      }`}
    >
      {value}
    </span>
  </div>
);

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative rounded-[28px] border border-zinc-200/80 bg-white/70 supports-[backdrop-filter]:backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden ${className}`}
  >
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
    <div className="relative">{children}</div>
  </div>
);

const TrafficMap = ({ originLabel, destinationLabel, onRouteChange }) => {
  const [apiCallCount, setApiCallCount] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [inFlight, setInFlight] = useState(false);
  const [lastRouteKey, setLastRouteKey] = useState(null);
  const [error, setError] = useState("");
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const retryTimeoutRef = useRef(null);
  const inFlightRef = useRef(false);

  // This function MUST NOT have inFlight in dependencies to avoid infinite loops
  const maybeCallApi = useCallback(async () => {
    // Use ref instead of state to check in-flight status
    if (inFlightRef.current) {
      console.log("Request already in flight, skipping");
      return;
    }

    if (!originLabel || !destinationLabel) {
      console.log("Origin or destination missing");
      return;
    }

    const apiKey =
      typeof window !== "undefined" && window.GOOGLE_MAPS_API_KEY
        ? window.GOOGLE_MAPS_API_KEY
        : "";
    
    if (!apiKey) {
      console.warn("API key not configured. Set VITE_GOOGLE_MAPS_API_KEY in .env");
      setError("API key not configured");
      return;
    }
    
    const trimmedOrigin = originLabel.trim();
    const trimmedDestination = destinationLabel.trim();
    
    if (!trimmedOrigin || !trimmedDestination) {
      console.log("Trimmed origin or destination is empty");
      return;
    }
    
    const key = trimmedOrigin + "|" + trimmedDestination;
    
    // Skip if we already processed this exact route
    if (key === lastRouteKey) {
      console.log("Same route as last request, skipping");
      return;
    }

    // FIRST: Check cache
    console.log("Checking cache for:", key);
    const cachedResult = apiCache.get(
      "distanceMatrix",
      trimmedOrigin,
      trimmedDestination
    );
    
    if (cachedResult) {
      console.log("✅ Cache hit! Using cached result:", cachedResult);
      setLastRouteKey(key);
      setError("");
      setCacheHits((c) => c + 1);
      setCacheHitRate(apiCache.getStats().hitRatio);
      setQuotaInfo(rateLimiter.getQuotaInfo());
      
      if (typeof onRouteChange === "function") {
        onRouteChange(cachedResult);
      }
      return;
    }

    // SECOND: Check rate limiter
    console.log("Checking rate limiter...");
    if (!rateLimiter.canMakeRequest("distanceMatrix")) {
      const quota = rateLimiter.getQuotaInfo();
      setQuotaInfo(quota);
      
      const status = rateLimiter.getEndpointStatus();
      const dmStatus = status.find(s => s.key === "distanceMatrix");
      
      console.warn("Rate limiter blocked request:", dmStatus);
      
      if (dmStatus?.isBackedOff) {
        const retryDelay = dmStatus.backoffUntilMs + 100;
        setError(`Rate limited. Retry in ${Math.ceil(dmStatus.backoffUntilMs / 1000)}s`);
        
        // Schedule retry
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          console.log("Auto-retrying after backoff...");
          maybeCallApi();
        }, retryDelay);
      } else if (quota.daily.critical || quota.monthly.critical) {
        setError("API quota exceeded for today");
      } else {
        setError("Rate limit reached. Please wait...");
      }
      return;
    }

    // THIRD: Make API call
    console.log("Making API call...");
    inFlightRef.current = true;
    setInFlight(true);
    setError("");

    try {
      const originEncoded = encodeURIComponent(trimmedOrigin);
      const destinationEncoded = encodeURIComponent(trimmedDestination);
      const url =
        "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" +
        originEncoded +
        "&destinations=" +
        destinationEncoded +
        "&mode=driving&departure_time=now&key=" +
        apiKey;

      console.log("📡 Fetching route from Google Maps:", { originLabel, destinationLabel });

      const res = await fetch(url);
      
      // Check HTTP status
      if (!res.ok) {
        console.error(`❌ HTTP Error: ${res.status} ${res.statusText}`);
        const canRetry = rateLimiter.recordError("distanceMatrix", res.status);
        
        if (canRetry) {
          console.log("⏳ Retryable error, scheduling backoff retry...");
          const status = rateLimiter.getEndpointStatus();
          const dmStatus = status.find(s => s.key === "distanceMatrix");
          if (dmStatus?.isBackedOff) {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              console.log("🔄 Retrying after backoff...");
              inFlightRef.current = false;
              setInFlight(false);
              maybeCallApi();
            }, dmStatus.backoffUntilMs + 100);
          }
        }
        
        setError(`HTTP ${res.status}: ${res.statusText}`);
        return;
      }

      const data = await res.json();
      const row = data && data.rows && data.rows[0];
      const element = row && row.elements && row.elements[0];

      // Check API response status
      if (!element || element.status !== "OK") {
        console.error(`❌ Route unavailable. Status: ${element?.status}`);
        
        if (element?.status === "OVER_QUERY_LIMIT") {
          rateLimiter.recordError("distanceMatrix", 429);
          setError("Rate limited by Google Maps API");
        } else {
          setError("Route unavailable");
        }
        return;
      }

      // Extract distance and duration data
      const distanceValue =
        element.distance && element.distance.value
          ? element.distance.value
          : 0;
      const durationBase =
        element.duration && element.duration.value
          ? element.duration.value
          : 0;
      const durationTraffic =
        element.duration_in_traffic && element.duration_in_traffic.value
          ? element.duration_in_traffic.value
          : durationBase;
      
      const distanceKm = distanceValue / 1000;
      const durationMin = durationTraffic / 60;
      const ratio = durationBase > 0 ? durationTraffic / durationBase : 1;
      
      let trafficLevel = "Medium";
      if (ratio < 1.1) {
        trafficLevel = "Low";
      } else if (ratio > 1.3) {
        trafficLevel = "High";
      }

      const result = { distanceKm, durationMin, trafficLevel };

      // Cache the result
      apiCache.set("distanceMatrix", trimmedOrigin, trimmedDestination, result);
      
      // Record success in rate limiter
      rateLimiter.recordSuccess("distanceMatrix");
      
      setLastRouteKey(key);
      setApiCallCount((c) => c + 1);
      setCacheHitRate(apiCache.getStats().hitRatio);
      setQuotaInfo(rateLimiter.getQuotaInfo());
      setError("");
      
      console.log("✅ Route fetched successfully:", result);

      if (typeof onRouteChange === "function") {
        onRouteChange(result);
      }
    } catch (err) {
      console.error("❌ API fetch error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      inFlightRef.current = false;
      setInFlight(false);
    }
  }, [originLabel, destinationLabel, lastRouteKey, onRouteChange]);

  useEffect(() => {
    maybeCallApi();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [maybeCallApi]);

  const totalRequests = apiCallCount + cacheHits;
  const cacheHitPercent = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(0) : 0;

  return (
    <div className="h-64 rounded-3xl bg-zinc-50 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-xs text-zinc-500 text-center px-4">
      <div>
        Live Maps distance and traffic is active when an API key is configured.
        <br />
        Type origin and destination to fetch route.
      </div>
      <div className="mt-2 text-[10px] text-zinc-400 space-y-1">
        <div>API Calls: {apiCallCount} · Cache Hits: {cacheHits} · Hit Rate: {cacheHitPercent}%</div>
        {quotaInfo && (
          <div className={quotaInfo.daily.warning ? "text-orange-600" : quotaInfo.daily.critical ? "text-red-600" : ""}>
            Daily Quota: {quotaInfo.daily.used}/{quotaInfo.daily.limit} ({quotaInfo.daily.percentUsed}%)
          </div>
        )}
      </div>
      {inFlight && (
        <div className="mt-1 text-[10px] text-zinc-400">⏳ Fetching live route...</div>
      )}
      {error && (
        <div className="mt-1 text-[10px] text-red-500">❌ {error}</div>
      )}
    </div>
  );
};

const AiravatLFareCalculatorPreview = () => {
  const { logout } = useAuth();
  
  const [vehicle, setVehicle] = useState("3 Wheeler - 500kg");
  const [traffic, setTraffic] = useState("Medium");
  const [condition, setCondition] = useState("New");
  const [origin, setOrigin] = useState(CONFIG.odLocations[0]);
  const [destination, setDestination] = useState(CONFIG.odLocations[1]);
  
  // Confirmed locations - only these trigger the map API call
  const [confirmedOrigin, setConfirmedOrigin] = useState("");
  const [confirmedDestination, setConfirmedDestination] = useState("");
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [baseKm, setBaseKm] = useState(3);
  const [extraKm, setExtraKm] = useState(0);
  const [waitMin, setWaitMin] = useState(0);
  const [stops, setStops] = useState(0);
  const [loading, setLoading] = useState(0);
  const [debug, setDebug] = useState(false);
  const [lockLiveTraffic, setLockLiveTraffic] = useState(false);
  const [apiDistanceKm, setApiDistanceKm] = useState(null);
  const [apiDurationMin, setApiDurationMin] = useState(null);

  // Handle Calculate Route button click
  const handleCalculateRoute = useCallback(() => {
    if (!origin.trim() || !destination.trim()) {
      console.warn("⚠️ Origin or destination missing");
      return;
    }
    
    if (origin.trim() === destination.trim()) {
      console.warn("⚠️ Origin and destination are the same");
      return;
    }
    
    console.log("🚀 Calculate Route triggered:", { origin, destination });
    setIsCalculating(true);
    setConfirmedOrigin(origin.trim());
    setConfirmedDestination(destination.trim());
    setRouteConfirmed(true);
    
    // Reset calculating state after a short delay (map will handle actual loading)
    setTimeout(() => setIsCalculating(false), 500);
  }, [origin, destination]);

  // Check if current inputs differ from confirmed route
  const hasUnconfirmedChanges = routeConfirmed && 
    (origin.trim() !== confirmedOrigin || destination.trim() !== confirmedDestination);

  const toNum = (v) => Number(v) || 0;

  const getODDistance = (from, to) => {
    if (!from || !to || from === to) return 0;
    const row = CONFIG.odMatrix[from];
    if (!row) return 0;
    const km = row[to];
    if (typeof km === "number") return km;
    const reverseRow = CONFIG.odMatrix[to];
    return (reverseRow && reverseRow[from]) || 0;
  };

  const manualDistance = toNum(baseKm) + toNum(extraKm);
  const odDistance = getODDistance(origin, destination);
  const effectiveKm = apiDistanceKm && apiDistanceKm > 0 ? apiDistanceKm : odDistance || manualDistance;

  const vehicleBaseFare = CONFIG.vehicleBaseFare[vehicle];
  const baseFare = typeof vehicleBaseFare === "number" ? vehicleBaseFare : CONFIG.baseFare;
  const distanceFare = effectiveKm * CONFIG.perKm;
  const subtotal =
    baseFare +
    distanceFare +
    toNum(loading) +
    toNum(waitMin) * CONFIG.waitPerMin +
    toNum(stops) * CONFIG.stopCharge;

  const trafficMult = CONFIG.traffic[traffic] || 1;
  const vehicleMult = CONFIG.vehicle[vehicle] || 1;
  const conditionMult = CONFIG.condition[condition] || 1;

  const combinedMult = trafficMult * vehicleMult * conditionMult;
  const beforeCommission = subtotal * combinedMult;
  const commission = beforeCommission * CONFIG.commissionRate;
  const finalFare = beforeCommission + commission;

  useEffect(() => {
    if (!debug) return;

    const tests = [
      {
        name: "3W Low New",
        traffic: "Low",
        vehicle: "3 Wheeler - 500kg",
        condition: "New",
      },
      {
        name: "Intra Medium Mid",
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "Mid",
      },
      {
        name: "Bolero High Old",
        traffic: "High",
        vehicle: "Bolero Pickup - 2 Ton",
        condition: "Old",
      },
      {
        name: "Edge: Large distance (150 km)",
        inputs: { baseKm: 0, extraKm: 150, waitMin: 0, stops: 0, loading: 0 },
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "New",
      },
      {
        name: "Charges: Waiting 30min + 2 stops",
        inputs: { baseKm: 10, extraKm: 0, waitMin: 30, stops: 2, loading: 0 },
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "New",
      },
      {
        name: "OD: Ulubari → Ganeshguri",
        origin: "Ulubari",
        destination: "Ganeshguri",
      },
      {
        name: "Precedence: Live distance overrides OD/manual",
        origin: "Ulubari",
        destination: "Panbazar",
      },
    ];

    const rows = tests.map((t) => ({
      case: t.name,
    }));

    console.table(rows);
  }, [debug]);

  const inr = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  const rootStyle = {
    "--air-from": "#8f1afa",
    "--air-to": "#5438f5",
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden bg-white"
      style={rootStyle}
    >
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(270deg, rgba(143,26,250,0.25), rgba(84,56,245,0.3), rgba(143,26,250,0.25))",
          backgroundSize: "300% 300%",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-8">
        <motion.div
          className="rounded-[28px] px-6 py-5 mb-6 text-white bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] shadow-[0_10px_40px_rgba(143,26,250,0.35)] relative overflow-hidden"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/30" />
              <h1 className="text-xl font-semibold">AiravatL</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-white/90">
              <a className="hover:text-white transition" href="#">
                Calculator
              </a>
              <a className="hover:text-white transition" href="#">
                Docs
              </a>
              <a className="hover:text-white transition" href="#">
                Support
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-white bg-white/20 border border-white/30 backdrop-blur-xl hover:bg-white/30 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] drop-shadow-[0_6px_30px_rgba(143,26,250,0.35)]">
            Fare Calculator
          </h2>
          <p className="mt-2 text-zinc-600">
            Select origin &amp; destination for realistic Guwahati intracity fares.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between p-6 border-b border-zinc-200/70">
                <h3 className="text-lg font-semibold text-zinc-900">Trip Parameters</h3>
                <div className="h-1.5 w-36 rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
              </div>

              <div className="p-6 space-y-8">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-zinc-900">
                      Route (Origin &amp; Destination)
                    </h4>
                    <span className="text-xs text-zinc-500">
                      Leave both same or distance blank to use manual km
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocationAutocomplete
                      value={origin}
                      onChange={setOrigin}
                      onSelect={(place) => {
                        console.log("📍 Origin selected:", place);
                      }}
                      label="Origin"
                      placeholder="Enter origin (e.g., Ulubari, Guwahati)"
                    />
                    <LocationAutocomplete
                      value={destination}
                      onChange={setDestination}
                      onSelect={(place) => {
                        console.log("📍 Destination selected:", place);
                      }}
                      label="Destination"
                      placeholder="Enter destination (e.g., Beltola, Guwahati)"
                    />
                  </div>
                  
                  {/* Calculate Route Button */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCalculateRoute}
                      disabled={!origin.trim() || !destination.trim() || origin.trim() === destination.trim() || isCalculating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all"
                    >
                      {isCalculating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span>Calculate Route</span>
                        </>
                      )}
                    </motion.button>
                    
                    {routeConfirmed && !hasUnconfirmedChanges && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Route calculated
                      </span>
                    )}
                    
                    {hasUnconfirmedChanges && (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Click to recalculate
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-3 text-xs text-zinc-500">
                    Computed distance (OD matrix):{" "}
                    {odDistance ? `${odDistance.toFixed(1)} km` : "— using manual distance"}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-zinc-600 mb-2">
                      Live Route &amp; Traffic (Google Maps)
                    </p>
                    <GoogleMapsComponent
                      pickupLocation={confirmedOrigin}
                      dropoffLocation={confirmedDestination}
                      onDistanceCalculated={({ distance, duration, trafficLevel }) => {
                        setApiDistanceKm(distance);
                        setApiDurationMin(duration);
                        // BUG #1 FIX: Only update traffic from map if not locked
                        // lockLiveTraffic=true means manual traffic is preserved
                        // lockLiveTraffic=false means map traffic updates calculator
                        if (!lockLiveTraffic && trafficLevel) {
                          console.log("🚦 Setting traffic from live map:", trafficLevel);
                          setTraffic(trafficLevel);
                        } else if (lockLiveTraffic) {
                          console.log("🔒 Traffic locked - map update ignored:", trafficLevel);
                        }
                      }}
                    />
                    {apiDistanceKm && (
                      <p className="mt-2 text-[11px] text-zinc-500">
                        Live distance: {apiDistanceKm.toFixed(1)} km · Estimated time:{" "}
                        {apiDurationMin && apiDurationMin.toFixed(0)} min · Traffic: {traffic}
                        {lockLiveTraffic && " (locked)"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option>3 Wheeler - 500kg</option>
                      <option>Intra - 1 Ton</option>
                      <option>Bolero Pickup - 2 Ton</option>
                      <option>Tata 407 - 4 Ton</option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Traffic Level
                    </label>
                    <select
                      value={traffic}
                      onChange={(e) => setTraffic(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                    <p className="mt-1 text-[11px] text-zinc-500 flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="accent-[var(--air-to)]"
                          checked={lockLiveTraffic}
                          onChange={(e) => {
                            setLockLiveTraffic(e.target.checked);
                            // BUG #4 FIX: Better UX feedback
                            console.log(
                              `🔒 Traffic Lock ${e.target.checked ? "ENABLED" : "DISABLED"} - Manual overrides will ${
                                e.target.checked ? "use" : "be overridden by"
                              } live map traffic`
                            );
                          }}
                        />
                        <span>
                          {lockLiveTraffic ? "🔒 Traffic Locked" : "🔓 Auto-update from map"}
                        </span>
                      </label>
                    </p>
                  </div>

                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Vehicle Condition
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option value="New">New (0–2 years)</option>
                      <option value="Mid">Mid (3–5 years)</option>
                      <option value="Old">Old (6+ years)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-zinc-900">
                      Manual Distance Override
                    </h4>
                    <span className="text-xs text-zinc-500">
                      Only used when no OD distance is available
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Base Distance
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={baseKm}
                          onChange={(e) => setBaseKm(e.target.value)}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">km</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Extra Distance
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={extraKm}
                          onChange={(e) => setExtraKm(e.target.value)}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">km</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-zinc-900">
                      Additional Charges
                    </h4>
                    <div className="h-1 w-28 rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Waiting Time
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={waitMin}
                          onChange={(e) => setWaitMin(e.target.value)}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">min</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Extra Stops
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={stops}
                          onChange={(e) => setStops(e.target.value)}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">stops</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Loading Charge
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <span className="text-sm text-zinc-900">₹</span>
                        <input
                          type="number"
                          value={loading}
                          onChange={(e) => setLoading(e.target.value)}
                          className="ml-2 w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative rounded-2xl px-6 py-3 text-sm font-semibold text-zinc-900 bg-white/80 border border-zinc-200/80 backdrop-blur-xl transition-all duration-300 hover:bg-white before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-l before:from-[var(--air-from)]/40 before:to-[var(--air-to)]/40 before:blur-xl before:opacity-0 hover:before:opacity-100"
                  >
                    Calculate Fare
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-2xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] shadow-lg hover:shadow-[0_0_25px_rgba(143,26,250,0.6)] transition"
                    onClick={() => {
                      setBaseKm(3);
                      setExtraKm(0);
                      setWaitMin(0);
                      setStops(0);
                      setLoading(0);
                      setVehicle("3 Wheeler - 500kg");
                      setTraffic("Medium");
                      setCondition("New");
                      setOrigin(CONFIG.odLocations[0]);
                      setDestination(CONFIG.odLocations[1]);
                      // Reset confirmed route states
                      setConfirmedOrigin("");
                      setConfirmedDestination("");
                      setRouteConfirmed(false);
                      setApiDistanceKm(null);
                      setApiDurationMin(null);
                      setLockLiveTraffic(false);
                    }}
                  >
                    Reset
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </section>

          <aside>
            <GlassCard className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                Fare Breakdown
              </h3>
              <div className="mt-4 divide-y divide-zinc-200/70">
                <div className="pb-2">
                  <StatRow
                    label="Trip Distance"
                    value={effectiveKm ? `${effectiveKm.toFixed(1)} km` : "—"}
                    tooltip="Uses live map when available, then OD matrix, otherwise manual distance"
                  />
                  <StatRow label="Base Fare" value={inr(baseFare)} />
                  <StatRow label="Distance Fare" value={inr(distanceFare)} />
                  <StatRow label="Subtotal" value={inr(subtotal)} />
                  <StatRow
                    label="Traffic Multiplier"
                    value={`${trafficMult.toFixed(2)}x`}
                    tooltip="Low = 0.95, Medium = 1.00, High = 1.20"
                  />
                  <StatRow
                    label="Vehicle Multiplier"
                    value={`${vehicleMult.toFixed(2)}x`}
                    tooltip="3W=1.00, Intra=1.25, Bolero=1.55"
                  />
                  <StatRow
                    label="Condition Multiplier"
                    value={`${conditionMult.toFixed(2)}x`}
                    tooltip="New=1.00, Mid=1.05, Old=1.10"
                  />
                  <StatRow
                    label="Combined Multiplier"
                    value={`${combinedMult.toFixed(2)}x`}
                    tooltip="traffic × vehicle × condition"
                  />
                  <StatRow
                    label="Before Commission"
                    value={inr(beforeCommission)}
                    tooltip="subtotal × combined multiplier"
                  />
                  <StatRow
                    label="Commission"
                    value={inr(commission)}
                    tooltip="commission = 15% of before-commission"
                    highlight
                  />
                </div>
                <div className="pt-4">
                  <div className="h-1 w-full rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Final Fare
                    </p>
                    <div className="mt-2 text-4xl font-extrabold">
                      <motion.span
                        animate={{
                          backgroundPosition: ["0% 50%", "100% 50%"],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{ backgroundSize: "200% 200%" }}
                        className="bg-clip-text text-transparent bg-gradient-to-l from-[var(--air-from)] via-[var(--air-to)] to-[var(--air-to)] drop-shadow-[0_2px_15px_rgba(84,56,245,0.35)]"
                      >
                        {inr(finalFare)}
                      </motion.span>
                    </div>
                    {apiDistanceKm && (
                      <p className="mt-3 text-[11px] text-zinc-500">
                        Using live distance from Google Maps (when enabled). Lock traffic to prevent auto-updates from map.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AiravatLFareCalculatorPreview;
