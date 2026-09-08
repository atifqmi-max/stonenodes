import { useState } from "react";
import { Field, Input, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Redeem() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();
  const { refresh } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/redeem", { code });
      setResult({ ok: true, message: `+${res.creditsAdded} credits added — new balance: ${res.newBalance}` });
      toast.push("Code redeemed!", "success");
      setCode("");
      await refresh();
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-stone-50">Redeem a code</h1>
      <p className="mb-6 text-sm text-stone-500">Paste a redeem code below to add credits to your balance.</p>

      <form onSubmit={submit} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <Field label="Redeem code">
          <Input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SN-XXXXXXXX"
            className="font-mono tracking-wide"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Redeeming…" : "Redeem"}
        </Button>
      </form>

      {result && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            result.ok
              ? "border-moss-500/30 bg-moss-500/10 text-moss-300"
              : "border-red-800/50 bg-red-950/40 text-red-300"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
