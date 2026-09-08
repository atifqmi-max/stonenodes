import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Field, Input, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { state } = useLocation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  if (!state?.userId) {
    navigate("/register");
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-email", { userId: state.userId, code });
      await refresh();
      toast.push("Email verified — welcome to StoneNodes!", "success");
      navigate("/dashboard");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={`Code sent to ${state.email}`}>
      <form onSubmit={submit}>
        <Field label="6-digit verification code">
          <Input
            required
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="tracking-[0.4em] text-center font-mono text-lg"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying…" : "Verify & continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
