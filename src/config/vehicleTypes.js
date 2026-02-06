/**
 * Vehicle Types Configuration
 * Centralized configuration for all vehicle types across calculators
 */

// Large Vehicle Types (for freight calculator)
export const LARGE_VEHICLE_TYPES = [
    { id: "12ton", label: "12 Ton - 22 ft", dailyRate: 3333, mileage: 4 },
    { id: "4ton", label: "4 Ton - 14 ft", dailyRate: 2500, mileage: 6 },
];

// Small Vehicle Types (for passenger calculator)
export const SMALL_VEHICLE_TYPES = [
    { id: "bike", label: "Bike", icon: "🏍️", multiplier: 0.5 },
    { id: "auto", label: "Auto", icon: "🛺", multiplier: 0.7 },
    { id: "sedan", label: "Sedan", icon: "🚗", multiplier: 1.0 },
    { id: "suv", label: "SUV", icon: "🚙", multiplier: 1.4 },
    { id: "premium", label: "Premium", icon: "✨", multiplier: 2.0 },
];

// Get vehicle by ID helper
export const getVehicleById = (vehicles, id) =>
    vehicles.find((v) => v.id === id) || vehicles[0];
