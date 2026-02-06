import React from "react";

/**
 * InputField - Reusable input field with label
 * Supports number/text types, disabled states, and highlight styling
 */
const InputField = ({
    label,
    value,
    onChange,
    placeholder = "",
    type = "number",
    disabled = false,
    highlight = false,
    suffix = "",
    prefix = "",
}) => (
    <div>
        <label
            className={`block text-xs font-medium mb-1.5 ${highlight ? "text-purple-600" : "text-gray-500"
                }`}
        >
            {label}
        </label>
        {disabled ? (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-400 text-sm">
                {prefix}{value}{suffix}
            </div>
        ) : (
            <div className="relative">
                {prefix && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm cursor-text focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all ${highlight
                            ? "border-purple-300 bg-purple-50/50 text-purple-700 font-medium"
                            : "border-gray-200 bg-white text-gray-800"
                        } ${prefix ? "pl-8" : ""} ${suffix ? "pr-12" : ""}`}
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        )}
    </div>
);

export default InputField;
