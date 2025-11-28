import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AiravatLFareCalculatorPreview from "./AiravatLFareCalculatorPreview";
import "./index.css";

// Expose Google Maps API key to window for use in components
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProtectedRoute>
        <AiravatLFareCalculatorPreview />
      </ProtectedRoute>
    </AuthProvider>
  </React.StrictMode>
);
