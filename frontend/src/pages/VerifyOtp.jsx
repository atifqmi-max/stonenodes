import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Field, Input, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtp() {
  const { state } = useLocation();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  if (!state?.userId) {
    navigate("/login");
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { userId: state.userId, otp });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Enter your one-time code" subtitle={`Code sent to ${state.email}`}>
      <form onSubmit={submit}>
        <Field label="One-time login code">
          <Input
            required
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="tracking-[0.4em] text-center font-mono text-lg"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
    </AuthShell>
  );
}
