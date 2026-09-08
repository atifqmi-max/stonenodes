import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/admin", label: "Users", end: true },
  { to: "/admin/redeem-codes", label: "Redeem Codes" },
  { to: "/admin/instances", label: "VPS Oversight" },
  { to: "/admin/nodes", label: "Nodes" },
  { to: "/admin/shop", label: "Shop" },
  { to: "/admin/broadcast", label: "Broadcast" },
  { to: "/admin/settings", label: "Settings" }
];

export default function AdminLayout() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-stone-50">Admin Panel</h1>
      <p className="mb-6 text-sm text-stone-500">Manage members, nodes, credits, and site settings.</p>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-stone-800">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm transition ${
                isActive
                  ? "border-moss-400 text-moss-300"
                  : "border-transparent text-stone-400 hover:text-stone-100"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
