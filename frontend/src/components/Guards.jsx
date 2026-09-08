import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Maintenance from "../pages/Maintenance";
import Suspended from "../pages/Suspended";

export function RequireAuth() {
  const { user, loading, siteStatus } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Admins can still use the panel during maintenance; everyone else sees the notice.
  if (siteStatus?.maintenanceMode && user.role !== "admin") {
    return <Maintenance message={siteStatus.maintenanceMessage} />;
  }
  if (user.status === "suspended") return <Suspended />;

  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
