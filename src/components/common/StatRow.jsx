import React from "react";

/**
 * StatRow - Reusable stat/value display row for cost breakdowns
 */
const StatRow = ({ label, value, highlight = false }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-zinc-600">{label}</span>
        <span
            className={`text-sm font-medium ${highlight ? "text-purple-600" : "text-zinc-900"
                }`}
        >
            {value}
        </span>
    </div>
);

export default StatRow;
