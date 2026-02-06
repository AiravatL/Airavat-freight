import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Shared UI Components
import { Card, InputField, SelectField, StatRow } from "../components/common";

// Map Components
import { GoogleMapsComponent, LocationAutocomplete } from "../components/maps";

// Pricing Configuration - same as original
export const PRICING_CONFIG = {
    baseFare: 200,
    perKm: 30,
    waitPerMin: 2,
    stopCharge: 50,
    commissionRate: 0.15,
    traffic: { Low: 1.0, Medium: 1.1, High: 1.2 },
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
    condition: { New: 1.0, Mid: 1.05, Old: 1.1 },
    odLocations: ["Ulubari", "Panbazar", "Ganeshguri", "Beltola", "Jalukbari", "Six Mile"],
    odMatrix: {
        Ulubari: { Panbazar: 3.5, Ganeshguri: 3.5, Beltola: 6, Jalukbari: 8, "Six Mile": 6 },
        Panbazar: { Ulubari: 3.5, Ganeshguri: 6, Beltola: 8.5, Jalukbari: 7, "Six Mile": 9 },
        Ganeshguri: { Ulubari: 3.5, Panbazar: 6, Beltola: 4, Jalukbari: 10, "Six Mile": 3 },
        Beltola: { Ulubari: 6, Panbazar: 8.5, Ganeshguri: 4, Jalukbari: 13, "Six Mile": 5 },
        Jalukbari: { Ulubari: 8, Panbazar: 7, Ganeshguri: 10, Beltola: 13, "Six Mile": 12 },
        "Six Mile": { Ulubari: 6, Panbazar: 9, Ganeshguri: 3, Beltola: 5, Jalukbari: 12 },
    },
};

const CONFIG = PRICING_CONFIG;

// ========== Main Component ==========

const SmallVehicleCalculatorPage = () => {
    const { logout } = useAuth();

    const [vehicle, setVehicle] = useState("3 Wheeler - 500kg");
    const [traffic, setTraffic] = useState("Medium");
    const [condition, setCondition] = useState("New");
    const [origin, setOrigin] = useState(CONFIG.odLocations[0]);
    const [destination, setDestination] = useState(CONFIG.odLocations[1]);

    const [confirmedOrigin, setConfirmedOrigin] = useState("");
    const [confirmedDestination, setConfirmedDestination] = useState("");
    const [routeConfirmed, setRouteConfirmed] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    const [baseKm, setBaseKm] = useState(3);
    const [extraKm, setExtraKm] = useState(0);
    const [waitMin, setWaitMin] = useState(0);
    const [stops, setStops] = useState(0);
    const [loading, setLoading] = useState(0);
    const [lockLiveTraffic, setLockLiveTraffic] = useState(false);
    const [apiDistanceKm, setApiDistanceKm] = useState(null);
    const [apiDurationMin, setApiDurationMin] = useState(null);

    const handleCalculateRoute = useCallback(() => {
        if (!origin.trim() || !destination.trim()) return;
        if (origin.trim() === destination.trim()) return;
        setIsCalculating(true);
        setConfirmedOrigin(origin.trim());
        setConfirmedDestination(destination.trim());
        setRouteConfirmed(true);
        setTimeout(() => setIsCalculating(false), 500);
    }, [origin, destination]);

    const hasUnconfirmedChanges = routeConfirmed && (origin.trim() !== confirmedOrigin || destination.trim() !== confirmedDestination);

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
    const subtotal = baseFare + distanceFare + toNum(loading) + toNum(waitMin) * CONFIG.waitPerMin + toNum(stops) * CONFIG.stopCharge;

    const trafficMult = CONFIG.traffic[traffic] || 1;
    const vehicleMult = CONFIG.vehicle[vehicle] || 1;
    const conditionMult = CONFIG.condition[condition] || 1;

    const combinedMult = trafficMult * vehicleMult * conditionMult;
    const beforeCommission = subtotal * combinedMult;
    const commission = beforeCommission * CONFIG.commissionRate;
    const finalFare = beforeCommission + commission;

    const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n) || 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="bg-purple-600 text-white px-6 py-5 rounded-2xl flex items-center justify-between">
                    <h1 className="text-xl font-semibold">AiravatL - Small Vehicle Calculator</h1>
                    <div className="flex items-center gap-3">
                        <Link to="/" className="px-4 py-2 text-sm font-medium bg-white/20 rounded-xl hover:bg-white/30 transition">
                            Back
                        </Link>
                        <button onClick={logout} className="px-4 py-2 text-sm font-medium bg-white/20 rounded-xl hover:bg-white/30 transition">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Route */}
                    <Card>
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Route (Origin & Destination)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <LocationAutocomplete value={origin} onChange={setOrigin} label="Origin" placeholder="Enter origin" />
                            <LocationAutocomplete value={destination} onChange={setDestination} label="Destination" placeholder="Enter destination" />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCalculateRoute}
                                disabled={!origin.trim() || !destination.trim() || origin.trim() === destination.trim() || isCalculating}
                                className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition"
                            >
                                {isCalculating ? "Calculating..." : "Calculate Route"}
                            </button>
                            {routeConfirmed && !hasUnconfirmedChanges && <span className="text-xs text-green-600 font-medium">Route calculated</span>}
                            {hasUnconfirmedChanges && <span className="text-xs text-amber-600 font-medium">Click to recalculate</span>}
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            OD distance: {odDistance ? `${odDistance.toFixed(1)} km` : "— using manual distance"}
                        </p>
                        <div className="mt-4">
                            <p className="text-xs font-medium text-gray-600 mb-2">Live Route (Google Maps)</p>
                            <GoogleMapsComponent
                                pickupLocation={confirmedOrigin}
                                dropoffLocation={confirmedDestination}
                                onDistanceCalculated={({ distance, duration, trafficLevel }) => {
                                    setApiDistanceKm(distance);
                                    setApiDurationMin(duration);
                                    if (!lockLiveTraffic && trafficLevel) setTraffic(trafficLevel);
                                }}
                            />
                            {apiDistanceKm && (
                                <p className="mt-2 text-xs text-gray-500">
                                    Live: {apiDistanceKm.toFixed(1)} km, {apiDurationMin?.toFixed(0)} min, Traffic: {traffic}
                                    {lockLiveTraffic && " (locked)"}
                                </p>
                            )}
                        </div>
                    </Card>

                    {/* Vehicle & Traffic */}
                    <Card>
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Vehicle & Conditions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SelectField
                                label="Vehicle Type"
                                value={vehicle}
                                onChange={(e) => setVehicle(e.target.value)}
                                options={["3 Wheeler - 500kg", "Intra - 1 Ton", "Bolero Pickup - 2 Ton", "Tata 407 - 4 Ton"]}
                            />
                            <SelectField label="Traffic Level" value={traffic} onChange={(e) => setTraffic(e.target.value)} options={["Low", "Medium", "High"]} />
                            <SelectField
                                label="Vehicle Condition"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                options={[
                                    { value: "New", label: "New (0-2 years)" },
                                    { value: "Mid", label: "Mid (3-5 years)" },
                                    { value: "Old", label: "Old (6+ years)" },
                                ]}
                            />
                        </div>
                        <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" checked={lockLiveTraffic} onChange={(e) => setLockLiveTraffic(e.target.checked)} />
                            {lockLiveTraffic ? "Traffic Locked" : "Auto-update traffic from map"}
                        </label>
                    </Card>

                    {/* Manual Distance */}
                    <Card>
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Manual Distance Override</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Base Distance" value={baseKm} onChange={(e) => setBaseKm(e.target.value)} suffix="km" />
                            <InputField label="Extra Distance" value={extraKm} onChange={(e) => setExtraKm(e.target.value)} suffix="km" />
                        </div>
                    </Card>

                    {/* Additional Charges */}
                    <Card>
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Additional Charges</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Waiting Time" value={waitMin} onChange={(e) => setWaitMin(e.target.value)} suffix="min" />
                            <InputField label="Extra Stops" value={stops} onChange={(e) => setStops(e.target.value)} suffix="stops" />
                            <InputField label="Loading Charge" value={loading} onChange={(e) => setLoading(e.target.value)} prefix="₹" />
                        </div>
                    </Card>

                    {/* Reset Button */}
                    <button
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
                            setConfirmedOrigin("");
                            setConfirmedDestination("");
                            setRouteConfirmed(false);
                            setApiDistanceKm(null);
                            setApiDurationMin(null);
                            setLockLiveTraffic(false);
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition"
                    >
                        Reset All
                    </button>
                </div>

                {/* RIGHT: Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fare Breakdown</h3>
                        <div className="space-y-1 border-b border-gray-200 pb-3 mb-3">
                            <StatRow label="Trip Distance" value={effectiveKm ? `${effectiveKm.toFixed(1)} km` : "—"} />
                            <StatRow label="Base Fare" value={inr(baseFare)} />
                            <StatRow label="Distance Fare" value={inr(distanceFare)} />
                            <StatRow label="Subtotal" value={inr(subtotal)} />
                        </div>
                        <div className="space-y-1 border-b border-gray-200 pb-3 mb-3">
                            <StatRow label="Traffic Mult" value={`${trafficMult.toFixed(2)}x`} />
                            <StatRow label="Vehicle Mult" value={`${vehicleMult.toFixed(2)}x`} />
                            <StatRow label="Condition Mult" value={`${conditionMult.toFixed(2)}x`} />
                            <StatRow label="Combined Mult" value={`${combinedMult.toFixed(2)}x`} />
                        </div>
                        <div className="space-y-1 border-b border-gray-200 pb-3 mb-3">
                            <StatRow label="Before Commission" value={inr(beforeCommission)} />
                            <StatRow label="Commission (15%)" value={inr(commission)} highlight />
                        </div>
                        <div className="pt-2">
                            <p className="text-xs uppercase tracking-wider text-gray-500">Final Fare</p>
                            <div className="mt-2 text-3xl font-bold text-purple-600">{inr(finalFare)}</div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SmallVehicleCalculatorPage;
