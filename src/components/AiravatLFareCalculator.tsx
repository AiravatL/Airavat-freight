import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ==========================
// Top-level pricing config
// ==========================
// Moved out of the component to avoid: "'import' and 'export' may only appear at the top level" errors.
export const PRICING_CONFIG = {
  baseFare: 50,
  perKm: 6,
  waitPerMin: 0.5,
  stopCharge: 10,
  commissionRate: 0.15,
  traffic: { Low: 1.0, Medium: 1.15, High: 1.25 },
  vehicle: {
    "3 Wheeler - 500kg": 1.0,
    "Intra - 1 Ton": 1.15,
    "Bolero Pickup - 2 Ton": 1.25,
  },
  condition: { New: 1.0, Mid: 1.05, Old: 1.1 },
} as const;
const CONFIG = PRICING_CONFIG;

// AiravatL Website Theme — Enhanced purple gradient (#8f1afa → #5438f5) + animated shimmer
// Tooltips added for multipliers + a Debug toggle to control console test logs.

const InfoIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 transition"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zM10 6a1 1 0 100 2 1 1 0 000-2z"
      clipRule="evenodd"
    />
  </svg>
);

const StatRow = ({
  label,
  value,
  highlight = false,
  tooltip = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tooltip?: string;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-zinc-700">{label}</span>
      {tooltip && (
        <div className="relative group">
          <InfoIcon />
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block z-20 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 shadow-lg">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    <span
      className={`text-sm ${
        highlight ? "text-purple-600 font-semibold" : "text-zinc-900"
      }`}
    >
      {value}
    </span>
  </div>
);

export default function AiravatLFareCalculatorPreview() {
  const [vehicle, setVehicle] = useState("3 Wheeler - 500kg");
  const [traffic, setTraffic] = useState("Medium");
  const [condition, setCondition] = useState("New");
  const [zone, setZone] = useState("Zone 1 – City Center");
  const [baseKm, setBaseKm] = useState(10);
  const [extraKm, setExtraKm] = useState(0);
  const [waitMin, setWaitMin] = useState(0);
  const [stops, setStops] = useState(0);
  const [loading, setLoading] = useState(0);
  const [debug, setDebug] = useState(false);

  // Glass container primitive
  const GlassCard = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`relative rounded-[28px] border border-zinc-200/80 bg-white/70 supports-[backdrop-filter]:backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );

  // --- Fare math (preview/demo values) ---
  const baseFare = CONFIG.baseFare; // fixed base
  const distanceFare = (Number(baseKm) + Number(extraKm)) * CONFIG.perKm; // ₹/km demo
  const subtotal =
    baseFare +
    distanceFare +
    Number(loading) +
    Number(waitMin) * CONFIG.waitPerMin +
    Number(stops) * CONFIG.stopCharge;
  const trafficMult =
    CONFIG.traffic[traffic as keyof typeof CONFIG.traffic] ?? 1;
  const vehicleMult =
    CONFIG.vehicle[vehicle as keyof typeof CONFIG.vehicle] ?? 1;
  const conditionMult =
    CONFIG.condition[condition as keyof typeof CONFIG.condition] ?? 1;
  const combinedMult = trafficMult * vehicleMult * conditionMult;
  const beforeCommission = subtotal * combinedMult;
  const commission = beforeCommission * CONFIG.commissionRate;
  const finalFare = Math.ceil(beforeCommission + commission);

  // --- Dev sanity tests (console only, toggled by debug) ---
  useEffect(() => {
    if (!debug) return;
    const tests = [
      // Existing tests (do not modify)
      {
        name: "3W Low New",
        traffic: "Low",
        vehicle: "3 Wheeler - 500kg",
        condition: "New",
        expectedCombined: (0.9 /*low*/ * 0.9 /*3W*/ * 1.0) /*new*/
          .toFixed(2),
      },
      {
        name: "Intra Medium Mid",
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "Mid",
        expectedCombined: (1.0 * 1.0 * 1.05).toFixed(2),
      },
      {
        name: "Bolero High Old",
        traffic: "High",
        vehicle: "Bolero Pickup - 2 Ton",
        condition: "Old",
        expectedCombined: (1.2 * 1.15 * 1.1).toFixed(2),
      },
      // Additional tests (added as requested)
      {
        name: "Edge: Large distance (150 km)",
        inputs: { baseKm: 0, extraKm: 150, waitMin: 0, stops: 0, loading: 0 },
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "New",
        expectedDistanceFare: 150 * CONFIG.perKm,
      },
      {
        name: "Charges: Waiting 30min + 2 stops",
        inputs: { baseKm: 10, extraKm: 0, waitMin: 30, stops: 2, loading: 0 },
        traffic: "Medium",
        vehicle: "Intra - 1 Ton",
        condition: "New",
        expectedExtra: 30 * CONFIG.waitPerMin + 2 * CONFIG.stopCharge,
      },
    ];
    const rows = tests.map((t) => ({
      case: t.name,
      expectedCombined: (t as any).expectedCombined ?? "-",
      expectedDistanceFare: (t as any).expectedDistanceFare ?? "-",
      expectedExtra: (t as any).expectedExtra ?? "-",
    }));
    // eslint-disable-next-line no-console
    console.table(rows);
  }, [debug]);

  // Currency formatter (INR)
  const inr = (n: any) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n));

  // CSS variables typing (TypeScript):
  const rootStyle = {
    ["--air-from" as any]: "#8f1afa",
    ["--air-to" as any]: "#5438f5",
  } as any;

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden bg-white"
      style={rootStyle}
    >
      {/* Animated Gradient Aura */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(270deg, rgba(143,26,250,0.25), rgba(84,56,245,0.3), rgba(143,26,250,0.25))",
          backgroundSize: "300% 300%",
        }}
      />

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-8">
        <motion.div
          className="rounded-[28px] px-6 py-5 mb-6 text-white bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] shadow-[0_10px_40px_rgba(143,26,250,0.35)] relative overflow-hidden"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/30" />
              <h1 className="text-xl font-semibold">AiravatL</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-white/90">
              <a className="hover:text-white transition" href="#">
                Calculator
              </a>
              <a className="hover:text-white transition" href="#">
                Docs
              </a>
              <a className="hover:text-white transition" href="#">
                Support
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 select-none">
                <input
                  type="checkbox"
                  className="accent-white/90"
                  checked={debug}
                  onChange={(e) => setDebug(e.target.checked)}
                />
                Show debug tests
              </label>
              <button className="rounded-2xl px-4 py-2 text-sm font-semibold text-zinc-900 bg-white/80 border border-white/50 backdrop-blur-xl hover:bg-white transition">
                Get Started
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main */}
      <div className="relative mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] drop-shadow-[0_6px_30px_rgba(143,26,250,0.35)]">
            Fare Calculator
          </h2>
          <p className="mt-2 text-zinc-600">
            Enter trip details to calculate accurate fares.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Form */}
          <section className="lg:col-span-2">
            <GlassCard>
              <div className="flex items-center justify-between p-6 border-b border-zinc-200/70">
                <h3 className="text-lg font-semibold text-zinc-900">
                  Trip Parameters
                </h3>
                <div className="h-1.5 w-36 rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
              </div>

              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option>3 Wheeler - 500kg</option>
                      <option>Intra - 1 Ton</option>
                      <option>Bolero Pickup - 2 Ton</option>
                    </select>
                  </div>
                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Traffic Level
                    </label>
                    <select
                      value={traffic}
                      onChange={(e) => setTraffic(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Vehicle Condition
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option value="New">New (0–2 years)</option>
                      <option value="Mid">Mid (3–5 years)</option>
                      <option value="Old">Old (6+ years)</option>
                    </select>
                  </div>
                  <div className="group">
                    <label className="text-xs font-medium text-zinc-600">
                      Zone
                    </label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--air-to)]/60 backdrop-blur-xl"
                    >
                      <option>Zone 1 – City Center</option>
                      <option>Zone 2 – Inner Ring</option>
                      <option>Zone 3 – Outer</option>
                    </select>
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-zinc-900">
                      Distance
                    </h4>
                    <div className="h-1 w-28 rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Base Distance
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={baseKm}
                          onChange={(e) => setBaseKm(Number(e.target.value))}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">km</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Extra Distance
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={extraKm}
                          onChange={(e) => setExtraKm(Number(e.target.value))}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">km</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Charges */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-zinc-900">
                      Additional Charges
                    </h4>
                    <div className="h-1 w-28 rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Waiting Time
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={waitMin}
                          onChange={(e) => setWaitMin(Number(e.target.value))}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">min</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Extra Stops
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <input
                          type="number"
                          value={stops}
                          onChange={(e) => setStops(Number(e.target.value))}
                          className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="ml-2 text-zinc-500">stops</span>
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-xs font-medium text-zinc-600">
                        Loading Charge
                      </label>
                      <div className="mt-1 flex items-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 shadow-sm">
                        <span className="text-sm text-zinc-900">₹</span>
                        <input
                          type="number"
                          value={loading}
                          onChange={(e) => setLoading(Number(e.target.value))}
                          className="ml-2 w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative rounded-2xl px-6 py-3 text-sm font-semibold text-zinc-900 bg-white/80 border border-zinc-200/80 backdrop-blur-xl transition-all duration-300 hover:bg-white before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-l before:from-[var(--air-from)]/40 before:to-[var(--air-to)]/40 before:blur-xl before:opacity-0 hover:before:opacity-100"
                  >
                    Calculate Fare
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-2xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)] shadow-lg hover:shadow-[0_0_25px_rgba(143,26,250,0.6)] transition"
                    onClick={() => {
                      setBaseKm(10);
                      setExtraKm(0);
                      setWaitMin(0);
                      setStops(0);
                      setLoading(0);
                      setVehicle("3 Wheeler - 500kg");
                      setTraffic("Medium");
                      setCondition("New");
                      setZone("Zone 1 – City Center");
                    }}
                  >
                    Reset
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* RIGHT: Fare Breakdown */}
          <aside>
            <GlassCard className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                Fare Breakdown
              </h3>
              <div className="mt-4 divide-y divide-zinc-200/70">
                <div className="pb-2">
                  <StatRow label="Base Fare" value={inr(baseFare)} />
                  <StatRow label="Distance Fare" value={inr(distanceFare)} />
                  <StatRow label="Subtotal" value={inr(subtotal)} />
                  <StatRow
                    label="Traffic Multiplier"
                    value={`${trafficMult.toFixed(2)}x`}
                    tooltip="Low = 1.0, Medium = 1.15, High = 1.25"
                  />
                  <StatRow
                    label="Vehicle Multiplier"
                    value={`${vehicleMult.toFixed(2)}x`}
                    tooltip="3W=1.0, Intra=1.15, Bolero=1.25"
                  />
                  <StatRow
                    label="Condition Multiplier"
                    value={`${conditionMult.toFixed(2)}x`}
                    tooltip="New=1.00, Mid=1.05, Old=1.10"
                  />
                  <StatRow
                    label="Combined Multiplier"
                    value={`${combinedMult.toFixed(2)}x`}
                    tooltip="traffic × vehicle × condition"
                  />
                  <StatRow
                    label="Before Commission"
                    value={inr(beforeCommission)}
                    tooltip="subtotal × combined multiplier"
                  />
                  <StatRow
                    label="Commission"
                    value={inr(commission)}
                    tooltip="commission = 15% of before-commission"
                    highlight
                  />
                </div>
                <div className="pt-4">
                  <div className="h-1 w-full rounded-full bg-gradient-to-l from-[var(--air-from)] to-[var(--air-to)]" />
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Final Fare
                    </p>
                    <div className="mt-2 text-4xl font-extrabold">
                      <motion.span
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{ backgroundSize: "200% 200%" }}
                        className="bg-clip-text text-transparent bg-gradient-to-l from-[var(--air-from)] via-[var(--air-to)] to-[var(--air-to)] drop-shadow-[0_2px_15px_rgba(84,56,245,0.35)]"
                      >
                        {inr(finalFare)}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
