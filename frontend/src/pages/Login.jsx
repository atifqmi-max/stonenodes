import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Field, Input, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      navigate("/verify-otp", { state: { userId: res.userId, email } });
    } catch (err) {
      if (err.code === "PENDING_VERIFICATION") {
        navigate("/verify-email", { state: { userId: err.data.userId, email } });
        return;
      }
      toast.push(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your VPS instances">
      <form onSubmit={submit}>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending code…" : "Continue"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">
        Don't have an account?{" "}
        <Link to="/register" className="text-moss-400 hover:text-moss-300">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
