import { useEffect, useState } from "react";
import { Field, Input, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminRedeemCodes() {
  const [codes, setCodes] = useState([]);
  const [credits, setCredits] = useState("");
  const [userCount, setUserCount] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/redeem-codes");
    setCodes(res.codes);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/redeem-codes", {
        credits: Number(credits),
        userCount: Number(userCount),
        code: customCode || undefined
      });
      toast.push(`Code created: ${res.code}`, "success");
      setCredits("");
      setUserCount("");
      setCustomCode("");
      await load();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this redeem code?")) return;
    await api.del(`/admin/redeem-codes/${id}`);
    toast.push("Code deleted", "success");
    await load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={generate} className="h-fit rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-stone-100">Generate a code</h3>
        <Field label="Credits">
          <Input type="number" step="0.01" required value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="50" />
        </Field>
        <Field label="User count" hint="How many different members can claim this code">
          <Input type="number" min="1" required value={userCount} onChange={(e) => setUserCount(e.target.value)} placeholder="10" />
        </Field>
        <Field label="Custom code" hint="Leave blank to auto-generate">
          <Input value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="SN-SUMMER25" className="font-mono" />
        </Field>
        <Button type="submit" className="w-full">
          Generate code
        </Button>
      </form>

      <div>
        {loading ? (
          <div className="text-sm text-stone-500">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-800 p-10 text-center text-sm text-stone-500">
            No redeem codes yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-800">
            <table className="w-full text-sm">
              <thead className="bg-stone-900/70 text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Claims</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {codes.map((c) => (
                  <tr key={c.id} className="bg-stone-900/30 hover:bg-stone-900/60">
                    <td className="px-4 py-3 font-mono text-stone-100">{c.code}</td>
                    <td className="px-4 py-3 text-stone-300">{c.credits}</td>
                    <td className="px-4 py-3 text-stone-300">
                      {c.claims_used} / {c.max_claims}
                    </td>
                    <td className="px-4 py-3 text-moss-300">{c.claims_remaining}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => remove(c.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
