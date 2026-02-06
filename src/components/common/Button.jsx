import React from "react";

/**
 * Button - Reusable button with variants
 * Variants: primary, secondary, ghost
 */
const Button = ({
    children,
    onClick,
    disabled = false,
    variant = "primary",
    className = "",
    type = "button",
}) => {
    const baseClasses =
        "px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50";

    const variantClasses = {
        primary: "bg-gray-900 text-white hover:bg-gray-800",
        secondary: "bg-purple-600 text-white hover:bg-purple-700",
        ghost: "bg-white/20 hover:bg-white/30 text-white",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
