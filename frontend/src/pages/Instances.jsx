import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";
import { Field, Input, Select, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const statusStyles = {
  running: "bg-moss-500/15 text-moss-300 border-moss-500/30",
  stopped: "bg-stone-700/40 text-stone-300 border-stone-600",
  suspended: "bg-red-950/50 text-red-300 border-red-800/50"
};

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    hostname: "",
    password: "",
    os: "",
    cpu: "",
    ram: "",
    nodeId: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { refresh } = useAuth();

  const load = async () => {
    setLoading(true);
    const [instRes, optRes] = await Promise.all([api.get("/instances"), api.get("/instances/options")]);
    setInstances(instRes.instances);
    setOptions(optRes);
    setForm((f) => ({
      ...f,
      os: f.os || optRes.os[0],
      cpu: f.cpu || optRes.cpu[0],
      ram: f.ram || optRes.ram[0]?.label,
      nodeId: f.nodeId || optRes.nodes[0]?.id || ""
    }));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/instances", form);
      toast.push("Instance created", "success");
      setCreateOpen(false);
      setForm((f) => ({ ...f, name: "", hostname: "", password: "" }));
      await load();
      await refresh();
    } catch (err) {
      if (err.code === "SLOT_LIMIT_REACHED") {
        toast.push(err.message, "error");
      } else {
        toast.push(err.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRamCost = options?.ram.find((r) => r.label === form.ram)?.costPerHour ?? 0;
  const cpuSurcharge = form.cpu === "AMD Ryzen 9 9950X" ? 20 : 0;
  const estimatedHourly = (selectedRamCost + cpuSurcharge).toFixed(4);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-50">Instances</h1>
          <p className="mt-1 text-sm text-stone-500">
            {instances.length} of {instances.length && instances[0] ? "" : ""}your VPS instances
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Create Instance</Button>
      </div>

      {loading ? (
        <div className="text-sm text-stone-500">Loading instances…</div>
      ) : instances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 p-12 text-center">
          <p className="mb-4 text-sm text-stone-500">You don't have any VPS instances yet.</p>
          <Button onClick={() => setCreateOpen(true)}>Create your first instance</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-900/70 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">OS</th>
                <th className="px-4 py-3 font-medium">RAM / CPU</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Cost / hr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {instances.map((inst) => (
                <tr key={inst.id} className="bg-stone-900/30 hover:bg-stone-900/60">
                  <td className="px-4 py-3">
                    <Link to={`/instances/${inst.id}`} className="font-medium text-stone-100 hover:text-moss-300">
                      {inst.name}
                    </Link>
                    <div className="text-xs text-stone-500">{inst.hostname}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-300">{inst.os}</td>
                  <td className="px-4 py-3 text-stone-300">
                    {(inst.ram_mb / 1024 >= 1 ? `${inst.ram_mb / 1024}GB` : `${inst.ram_mb}MB`)} · {inst.cpu}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inst.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-300">{inst.hourly_cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Instance" width="max-w-lg">
        {options && (
          <form onSubmit={submitCreate}>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="VPS Name">
                <Input required value={form.name} onChange={update("name")} placeholder="my-server" />
              </Field>
              <Field label="Hostname">
                <Input required value={form.hostname} onChange={update("hostname")} placeholder="server.local" />
              </Field>
            </div>
            <Field label="Root password">
              <Input required type="password" value={form.password} onChange={update("password")} placeholder="••••••••" />
            </Field>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Username">
                <Input disabled value="root" />
              </Field>
              <Field label="Select OS">
                <Select value={form.os} onChange={update("os")}>
                  {options.os.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Select CPU">
                <Select value={form.cpu} onChange={update("cpu")}>
                  {options.cpu.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="VPS RAM">
                <Select value={form.ram} onChange={update("ram")}>
                  {options.ram.map((r) => (
                    <option key={r.label} value={r.label}>
                      {r.label} ({r.costPerHour} cr/hr)
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Select Node">
              <Select value={form.nodeId} onChange={update("nodeId")}>
                {options.nodes.length === 0 && <option value="">No nodes available</option>}
                {options.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} {n.type === "local" ? "(local)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mb-5 flex items-center justify-between rounded-lg border border-stone-700 bg-stone-850 bg-stone-800/60 px-4 py-3 text-sm">
              <span className="text-stone-400">Estimated cost</span>
              <span className="font-mono font-semibold text-moss-300">{estimatedHourly} credits / hour</span>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !options.nodes.length}>
                {submitting ? "Creating…" : "Create Instance"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
