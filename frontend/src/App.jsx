import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from "./components/Guards";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import Instances from "./pages/Instances";
import InstanceDetail from "./pages/InstanceDetail";
import Redeem from "./pages/Redeem";
import Shop from "./pages/Shop";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRedeemCodes from "./pages/admin/AdminRedeemCodes";
import AdminInstances from "./pages/admin/AdminInstances";
import AdminNodes from "./pages/admin/AdminNodes";
import AdminShop from "./pages/admin/AdminShop";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public / pre-auth */}
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Login />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuthed>
                  <Register />
                </RedirectIfAuthed>
              }
            />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />

            {/* Authenticated member area */}
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/instances" element={<Instances />} />
                <Route path="/instances/:id" element={<InstanceDetail />} />
                <Route path="/redeem" element={<Redeem />} />
                <Route path="/shop" element={<Shop />} />

                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminUsers />} />
                    <Route path="redeem-codes" element={<AdminRedeemCodes />} />
                    <Route path="instances" element={<AdminInstances />} />
                    <Route path="nodes" element={<AdminNodes />} />
                    <Route path="shop" element={<AdminShop />} />
                    <Route path="broadcast" element={<AdminBroadcast />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
