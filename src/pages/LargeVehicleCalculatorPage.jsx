import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Shared UI Components
import { Card, InputField, StatRow, SectionTitle, Button } from "../components/common";

// Map Components
import { GoogleMapsComponent, LocationAutocomplete } from "../components/maps";

// Config & Utils
import { LARGE_VEHICLE_TYPES, getVehicleById } from "../config/vehicleTypes";
import { OPERATING_COSTS, DEFAULT_LOCATIONS } from "../config/constants";
import { inr, toNumber } from "../utils/formatters";

const LargeVehicleCalculatorPage = () => {
    const { logout } = useAuth();

    // State
    const [origin, setOrigin] = useState(DEFAULT_LOCATIONS[0]);
    const [destination, setDestination] = useState(DEFAULT_LOCATIONS[1]);
    const [vehicleId, setVehicleId] = useState(LARGE_VEHICLE_TYPES[0].id);
    const [tripDays, setTripDays] = useState(1);
    const [fuelRate, setFuelRate] = useState(OPERATING_COSTS.DEFAULT_FUEL_RATE);
    const [additionalDistance, setAdditionalDistance] = useState(0);

    // Overrides
    const [manualVehicleDailyRate, setManualVehicleDailyRate] = useState(null);
    const [manualMileage, setManualMileage] = useState(null);

    // Variable expenses
    const [roadExpense, setRoadExpense] = useState(0);
    const [tollCharge, setTollCharge] = useState(0);
    const [loadingCost, setLoadingCost] = useState(0);
    const [marginPercent, setMarginPercent] = useState(15);

    // Map API State
    const [confirmedOrigin, setConfirmedOrigin] = useState("");
    const [confirmedDestination, setConfirmedDestination] = useState("");
    const [isCalculating, setIsCalculating] = useState(false);
    const [apiDistanceKm, setApiDistanceKm] = useState(0);
    const [apiDurationMin, setApiDurationMin] = useState(0);
    const [trafficLevel, setTrafficLevel] = useState("Medium");

    // Derived Values
    const selectedVehicle = getVehicleById(LARGE_VEHICLE_TYPES, vehicleId);
    const vehicleDailyRate = manualVehicleDailyRate !== null ? manualVehicleDailyRate : selectedVehicle.dailyRate;
    const vehicleMileage = manualMileage !== null ? manualMileage : selectedVehicle.mileage;
    const mapDistance = apiDistanceKm || 0;
    const totalDistance = mapDistance + toNumber(additionalDistance);

    // Cost Calculations
    const vehicleCost = vehicleDailyRate * tripDays;
    const fuelConsumption = totalDistance / vehicleMileage;
    const fuelCost = fuelConsumption * fuelRate;
    const defCost = fuelCost * OPERATING_COSTS.DEF_PERCENTAGE_OF_FUEL;
    const driverCost = OPERATING_COSTS.DRIVER_DAILY_BATA * tripDays;
    const otherExpenses = toNumber(roadExpense) + toNumber(tollCharge) + toNumber(loadingCost);
    const totalOperatingCost = vehicleCost + fuelCost + defCost + driverCost + otherExpenses;
    const marginAmount = totalOperatingCost * (marginPercent / 100);
    const finalAmount = totalOperatingCost + marginAmount;

    // Handlers
    const handleCalculateRoute = useCallback(() => {
        if (!origin.trim() || !destination.trim() || origin.trim() === destination.trim()) return;
        setIsCalculating(true);
        setConfirmedOrigin(origin.trim());
        setConfirmedDestination(destination.trim());
        setTimeout(() => setIsCalculating(false), 500);
    }, [origin, destination]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg">
                <div>
                    <h1 className="text-xl font-bold">AiravatL Trip Calculator</h1>
                    <p className="text-purple-200 text-sm">Calculate trip costs with precision</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/" className="bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                        ← Back
                    </Link>
                    <button onClick={logout} className="bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: INPUTS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Route Section */}
                    <Card>
                        <SectionTitle>📍 Route</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <LocationAutocomplete value={origin} onChange={setOrigin} label="Origin" placeholder="Enter origin city" />
                            <LocationAutocomplete value={destination} onChange={setDestination} label="Destination" placeholder="Enter destination city" />
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-4">
                            <Button onClick={handleCalculateRoute} disabled={isCalculating}>
                                {isCalculating ? "Calculating..." : "Get Map Distance"}
                            </Button>
                            {apiDistanceKm > 0 && (
                                <span className="text-emerald-600 font-semibold text-sm bg-emerald-50 px-4 py-2 rounded-xl">
                                    ✓ Map Distance: {apiDistanceKm.toFixed(1)} km
                                </span>
                            )}
                        </div>

                        <div className="mt-5">
                            <GoogleMapsComponent
                                pickupLocation={confirmedOrigin}
                                dropoffLocation={confirmedDestination}
                                onDistanceCalculated={({ distance, duration, trafficLevel }) => {
                                    setApiDistanceKm(distance);
                                    setApiDurationMin(duration);
                                    setTrafficLevel(trafficLevel);
                                }}
                            />
                        </div>
                    </Card>

                    {/* Trip Details */}
                    <Card>
                        <SectionTitle>📅 Trip Details</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <InputField label="Additional Distance (km)" value={additionalDistance} onChange={e => setAdditionalDistance(e.target.value)} />
                            <InputField label="Total Distance" value={`${totalDistance.toFixed(1)} km`} disabled />
                            <InputField label="Trip Duration (Days)" value={tripDays} onChange={e => setTripDays(parseInt(e.target.value) || 1)} />
                        </div>
                    </Card>

                    {/* Vehicle Selection */}
                    <Card>
                        <SectionTitle>🚛 Vehicle Selection</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {LARGE_VEHICLE_TYPES.map(v => (
                                <div
                                    key={v.id}
                                    onClick={() => { setVehicleId(v.id); setManualVehicleDailyRate(null); setManualMileage(null); }}
                                    className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${vehicleId === v.id
                                        ? "border-purple-500 bg-purple-50 shadow-md"
                                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-semibold ${vehicleId === v.id ? "text-purple-700" : "text-gray-800"}`}>{v.label}</span>
                                        {vehicleId === v.id && <div className="h-3 w-3 rounded-full bg-purple-500" />}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">Daily: ₹{v.dailyRate} · Mileage: {v.mileage} km/l</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Expenses */}
                    <Card>
                        <SectionTitle>💰 Variables & Expenses</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                            <InputField label="Fuel Rate (₹/L)" value={fuelRate} onChange={e => setFuelRate(e.target.value)} />
                            <InputField label="Vehicle Cost (Override)" value={manualVehicleDailyRate ?? ""} onChange={e => setManualVehicleDailyRate(e.target.value ? parseFloat(e.target.value) : null)} placeholder={selectedVehicle.dailyRate} />
                            <InputField label="Mileage (Override)" value={manualMileage ?? ""} onChange={e => setManualMileage(e.target.value ? parseFloat(e.target.value) : null)} placeholder={selectedVehicle.mileage} />
                            <InputField label="Road Expense" value={roadExpense} onChange={e => setRoadExpense(e.target.value)} />
                            <InputField label="Toll Charges" value={tollCharge} onChange={e => setTollCharge(e.target.value)} />
                            <InputField label="Loading/Unloading" value={loadingCost} onChange={e => setLoadingCost(e.target.value)} />
                            <InputField label="Margin (%)" value={marginPercent} onChange={e => setMarginPercent(e.target.value)} highlight />
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: SUMMARY */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-5">Cost Breakdown</h3>

                        <div className="divide-y divide-zinc-200/70">
                            <div className="pb-2">
                                <StatRow label="Total Distance" value={`${totalDistance.toFixed(1)} km`} />
                                <StatRow label="Vehicle Cost" value={inr(vehicleCost)} />
                                <StatRow label="Fuel Cost" value={inr(fuelCost)} />
                                <StatRow label="DEF Cost (6%)" value={inr(defCost)} />
                                <StatRow label="Driver Bata" value={inr(driverCost)} />
                            </div>
                            <div className="py-2">
                                <StatRow label="Road Expenses" value={inr(roadExpense)} />
                                <StatRow label="Toll Charges" value={inr(tollCharge)} />
                                <StatRow label="Loading/Unloading" value={inr(loadingCost)} />
                            </div>
                            <div className="py-2">
                                <StatRow label="Subtotal" value={inr(totalOperatingCost)} />
                                <StatRow label={`Margin (${marginPercent}%)`} value={`+ ${inr(marginAmount)}`} highlight />
                            </div>
                            <div className="pt-4">
                                <div className="h-1 w-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mb-4" />
                                <p className="text-xs uppercase tracking-wider text-zinc-500">Final Amount</p>
                                <div className="mt-2 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                    {inr(finalAmount)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LargeVehicleCalculatorPage;
