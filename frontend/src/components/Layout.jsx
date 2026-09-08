import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/instances", label: "Instances", icon: ServerIcon },
  { to: "/redeem", label: "Redeem", icon: TicketIcon },
  { to: "/shop", label: "Credits Shop", icon: CoinIcon }
];

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ServerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <circle cx="7.5" cy="7" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TicketIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9Z" strokeLinejoin="round" />
      <path d="M10 7v10" strokeDasharray="1.5 2" />
    </svg>
  );
}
function CoinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 15c.5 1 1.4 1.5 2.5 1.5 1.7 0 3-1 3-2.3 0-1.4-1.1-1.9-3-2.4-1.9-.5-3-1-3-2.3C9 8 10.3 7 12 7c1.1 0 2 .5 2.5 1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-stone-800 bg-stone-900/60 px-4 py-5">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moss-500/15 text-moss-400">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 8v8l7-4-7-4Z" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-stone-50">
              Stone<span className="text-moss-400">Nodes</span>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-moss-500/12 text-moss-300"
                    : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                }`
              }
            >
              <item.icon width={17} height={17} />
              {item.label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <>
              <div className="mt-4 mb-1 px-3 text-xs text-stone-600">Administration</div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-moss-500/12 text-moss-300"
                      : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                  }`
                }
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3Z" strokeLinejoin="round" />
                </svg>
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-stone-800 pt-4">
          <div className="mb-3 px-2 text-xs text-stone-500">
            Signed in as <span className="text-stone-300">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-stone-700 px-3 py-2 text-left text-sm text-stone-400 transition hover:bg-stone-800 hover:text-stone-100"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-stone-800 bg-stone-900/40 px-6">
          <div className="flex items-center gap-2 rounded-full border border-moss-500/30 bg-moss-500/10 px-3 py-1.5 text-sm">
            <CoinIcon width={15} height={15} className="text-moss-400" />
            <span className="font-mono font-semibold text-moss-300">{Number(user?.credits ?? 0).toFixed(2)}</span>
            <span className="text-stone-500">credits</span>
          </div>
        </header>
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
