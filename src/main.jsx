import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./Home";
import AiravatLFareCalculatorPreview from "./AiravatLFareCalculatorPreview";
import SmallVehicleCalculator from "./SmallVehicleCalculator";
import "./index.css";

// Expose Google Maps API key to window for use in components
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoute>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/large-vehicle" element={<AiravatLFareCalculatorPreview />} />
            <Route path="/small-vehicle" element={<SmallVehicleCalculator />} />
          </Routes>
        </ProtectedRoute>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
