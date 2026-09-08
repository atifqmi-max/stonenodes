import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [siteStatus, setSiteStatus] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const status = await api.get("/status");
      setSiteStatus(status);
    } catch (e) {
      /* ignore */
    }
    try {
      const { user } = await api.get("/auth/me");
      setUser(user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Light polling so the credit balance in the top bar reflects hourly
    // billing deductions without requiring a manual page refresh.
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, siteStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
