/**
 * App Constants
 * Centralized configuration for app-wide constants
 */

// Driver and vehicle operating costs
export const OPERATING_COSTS = {
    DRIVER_DAILY_BATA: 1000,
    DEF_PERCENTAGE_OF_FUEL: 0.06,
    DEFAULT_FUEL_RATE: 96,
};

// Default locations for origin/destination dropdowns
export const DEFAULT_LOCATIONS = [
    "Ulubari",
    "Panbazar",
    "Ganeshguri",
    "Beltola",
    "Jalukbari",
    "Six Mile",
];

// Small vehicle pricing configuration
export const SMALL_VEHICLE_PRICING = {
    BASE_FARE: 50,
    PER_KM_RATE: 12,
    MINIMUM_FARE: 80,
    TRAFFIC_MULTIPLIERS: {
        low: 1.0,
        medium: 1.15,
        high: 1.35,
    },
    TIME_SURCHARGES: {
        normal: 0,
        peak: 20,
        night: 30,
    },
};

// Pre-calculated distances between common locations (km)
export const OD_DISTANCES = {
    Ulubari: { Panbazar: 2, Ganeshguri: 5, Beltola: 8, Jalukbari: 8, "Six Mile": 6 },
    Panbazar: { Ulubari: 2, Ganeshguri: 6, Beltola: 10, Jalukbari: 7, "Six Mile": 9 },
    Ganeshguri: { Ulubari: 5, Panbazar: 6, Beltola: 4, Jalukbari: 10, "Six Mile": 3 },
    Beltola: { Ulubari: 8, Panbazar: 10, Ganeshguri: 4, Jalukbari: 13, "Six Mile": 5 },
    Jalukbari: { Ulubari: 8, Panbazar: 7, Ganeshguri: 10, Beltola: 13, "Six Mile": 12 },
    "Six Mile": { Ulubari: 6, Panbazar: 9, Ganeshguri: 3, Beltola: 5, Jalukbari: 12 },
};

// Get distance between two locations
export const getODDistance = (from, to) => {
    if (from === to) return 0;
    return OD_DISTANCES[from]?.[to] || OD_DISTANCES[to]?.[from] || 0;
};
