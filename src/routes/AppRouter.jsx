import React from "react";
import { Routes, Route } from "react-router-dom";

// Pages
import { HomePage, LargeVehicleCalculatorPage, SmallVehicleCalculatorPage } from "../pages";

// Auth
import { ProtectedRoute } from "../components/auth";

/**
 * AppRouter - Centralized routing configuration
 * All routes are protected by ProtectedRoute which handles authentication
 */
const AppRouter = () => {
    return (
        <ProtectedRoute>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/large-vehicle" element={<LargeVehicleCalculatorPage />} />
                <Route path="/small-vehicle" element={<SmallVehicleCalculatorPage />} />
            </Routes>
        </ProtectedRoute>
    );
};

export default AppRouter;
