/**
 * Formatting Utilities
 * Currency and number formatting functions
 */

/**
 * Format number as Indian Rupees (INR)
 * @param {number} n - Number to format
 * @returns {string} Formatted currency string
 */
export const formatINR = (n) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n || 0);

/**
 * Alias for formatINR (shorter name for inline use)
 */
export const inr = formatINR;

/**
 * Parse a value to number, returning default if NaN
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number}
 */
export const toNumber = (value, defaultValue = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Format distance with km suffix
 * @param {number} km - Distance in kilometers
 * @returns {string}
 */
export const formatDistance = (km) => `${(km || 0).toFixed(1)} km`;

/**
 * Format duration in minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string}
 */
export const formatDuration = (minutes) => {
    if (!minutes) return "0 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
