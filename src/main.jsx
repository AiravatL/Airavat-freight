import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Expose Google Maps API key to window for use in components
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
