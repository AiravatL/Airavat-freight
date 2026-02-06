import React from "react";

/**
 * Card - Reusable card wrapper component
 */
const Card = ({ children, className = "" }) => (
    <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm ${className}`}>
        {children}
    </div>
);

export default Card;
