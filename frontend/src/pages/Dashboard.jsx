import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`mt-2 font-mono text-3xl font-semibold ${accent || "text-stone-50"}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get("/dashboard/summary").then(setSummary).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-stone-50">
          Welcome back, <span className="text-moss-400">{user?.username}</span>
        </h1>
        <p className="mt-1 text-sm text-stone-500">Here's what's running on your account right now.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total VPS" value={summary?.totals.total ?? "—"} />
        <StatCard label="Running" value={summary?.totals.running ?? "—"} accent="text-moss-400" />
        <StatCard label="Stopped" value={summary?.totals.stopped ?? "—"} accent="text-stone-300" />
        <StatCard label="Suspended" value={summary?.totals.suspended ?? "—"} accent="text-red-400" />
        <StatCard label="Credit balance" value={Number(user?.credits ?? 0).toFixed(2)} accent="text-moss-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/instances"
          className="group rounded-2xl border border-stone-800 bg-stone-900/50 p-5 transition hover:border-moss-500/40"
        >
          <div className="mb-2 text-sm font-semibold text-stone-100 group-hover:text-moss-300">
            Manage instances
          </div>
          <p className="text-sm text-stone-500">Create a new VPS or manage the ones you already have.</p>
        </Link>
        <Link
          to="/redeem"
          className="group rounded-2xl border border-stone-800 bg-stone-900/50 p-5 transition hover:border-moss-500/40"
        >
          <div className="mb-2 text-sm font-semibold text-stone-100 group-hover:text-moss-300">Redeem a code</div>
          <p className="text-sm text-stone-500">Got a code from the admin? Add credits to your balance.</p>
        </Link>
        <Link
          to="/shop"
          className="group rounded-2xl border border-stone-800 bg-stone-900/50 p-5 transition hover:border-moss-500/40"
        >
          <div className="mb-2 text-sm font-semibold text-stone-100 group-hover:text-moss-300">Buy more credits</div>
          <p className="text-sm text-stone-500">Browse credit packages and get in touch on Discord.</p>
        </Link>
      </div>
    </div>
  );
}
