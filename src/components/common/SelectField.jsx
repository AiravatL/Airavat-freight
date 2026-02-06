import React from "react";

/**
 * SelectField - Reusable select dropdown component
 */
const SelectField = ({ label, value, onChange, options, className = "" }) => (
    <div className={className}>
        <label className="block text-xs font-medium mb-1.5 text-gray-500">
            {label}
        </label>
        <select
            value={value}
            onChange={onChange}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
        >
            {options.map((opt) => (
                <option key={typeof opt === "string" ? opt : opt.value} value={typeof opt === "string" ? opt : opt.value}>
                    {typeof opt === "string" ? opt : opt.label}
                </option>
            ))}
        </select>
    </div>
);

export default SelectField;
