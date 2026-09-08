import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Field, Input, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const [form, setForm] = useState({ email: "", username: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      toast.push("Verification code sent to your email", "success");
      navigate("/verify-email", { state: { userId: res.userId, email: form.email } });
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Get 10 free credits to start">
      <form onSubmit={submit}>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={update("email")} placeholder="you@example.com" />
        </Field>
        <Field label="Username">
          <Input required value={form.username} onChange={update("username")} placeholder="yourname" />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input type="password" required value={form.password} onChange={update("password")} placeholder="••••••••" />
        </Field>
        <Field label="Confirm password">
          <Input type="password" required value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Register"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link to="/login" className="text-moss-400 hover:text-moss-300">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
