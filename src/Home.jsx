import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const Home = () => {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-5 rounded-2xl shadow-lg">
                <div>
                    <h1 className="text-2xl font-bold">AiravatL Calculators</h1>
                    <p className="text-purple-200 text-sm">Choose your vehicle type calculator</p>
                </div>
                <button
                    onClick={logout}
                    className="bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                    Logout
                </button>
            </div>

            {/* Calculator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Large Vehicle Card */}
                <Link
                    to="/large-vehicle"
                    className="group bg-white p-8 rounded-3xl border-2 border-gray-200 shadow-lg hover:border-purple-400 hover:shadow-xl transition-all"
                >
                    <div className="text-5xl mb-4">🚛</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-700 transition-colors">
                        Large Vehicle Calculator
                    </h2>
                    <p className="text-gray-500 text-sm mb-4">
                        For freight and logistics: 12 Ton (22 ft) and 4 Ton (14 ft) trucks
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-6">
                        <li>✓ Vehicle daily rates</li>
                        <li>✓ Fuel & DEF costs</li>
                        <li>✓ Driver bata</li>
                        <li>✓ Road, toll & loading expenses</li>
                        <li>✓ Margin calculation</li>
                    </ul>
                    <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                        Open Calculator →
                    </div>
                </Link>

                {/* Small Vehicle Card */}
                <Link
                    to="/small-vehicle"
                    className="group bg-white p-8 rounded-3xl border-2 border-gray-200 shadow-lg hover:border-blue-400 hover:shadow-xl transition-all"
                >
                    <div className="text-5xl mb-4">🚗</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">
                        Small Vehicle Calculator
                    </h2>
                    <p className="text-gray-500 text-sm mb-4">
                        For passenger transport: Bikes, Autos, Cars, and SUVs
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-6">
                        <li>✓ Distance-based pricing</li>
                        <li>✓ Vehicle type multipliers</li>
                        <li>✓ Traffic level adjustments</li>
                        <li>✓ Peak hour & night surcharges</li>
                        <li>✓ Minimum fare guarantee</li>
                    </ul>
                    <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                        Open Calculator →
                    </div>
                </Link>
            </div>

            {/* Footer */}
            <div className="text-center mt-12 text-gray-400 text-sm">
                AiravatL • Fare Calculator Suite
            </div>
        </div>
    );
};

export default Home;
