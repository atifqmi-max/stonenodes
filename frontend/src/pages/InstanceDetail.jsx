import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "../components/Modal";
import { Field, Input, Select, Button } from "../components/Form";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

function CopyField({ label, value }) {
  const toast = useToast();
  const copy = () => {
    navigator.clipboard.writeText(String(value ?? ""));
    toast.push(`${label} copied`, "success");
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2">
      <div>
        <div className="text-xs text-stone-500">{label}</div>
        <div className="font-mono text-sm text-stone-200">{value || "—"}</div>
      </div>
      <button onClick={copy} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-800 hover:text-moss-300" aria-label={`Copy ${label}`}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      </button>
    </div>
  );
}

const OS_OPTIONS = ["Debian 11", "Debian 12", "Ubuntu 24.04", "Ubuntu 22.04", "Ubuntu 20.04"];

export default function InstanceDetail() {
  const { id } = useParams();
  const [instance, setInstance] = useState(null);
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reinstallOpen, setReinstallOpen] = useState(false);
  const [reinstallOs, setReinstallOs] = useState(OS_OPTIONS[0]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [hostnameOpen, setHostnameOpen] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const load = async () => {
    const res = await api.get(`/instances/${id}`);
    setInstance(res.instance);
    setNewHostname(res.instance.hostname);
    try {
      const u = await api.get(`/instances/${id}/usage`);
      setUsage(u.usage);
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const action = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(successMsg, "success");
      await load();
      await refresh();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirm(`Delete "${instance.name}"? This cannot be undone.`)) return;
    await action(() => api.del(`/instances/${id}`), "Instance deleted");
    navigate("/instances");
  };

  if (!instance) return <div className="text-sm text-stone-500">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-50">{instance.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{instance.hostname}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs capitalize ${
            instance.status === "running"
              ? "border-moss-500/30 bg-moss-500/15 text-moss-300"
              : instance.status === "suspended"
              ? "border-red-800/50 bg-red-950/50 text-red-300"
              : "border-stone-600 bg-stone-700/40 text-stone-300"
          }`}
        >
          {instance.status}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <CopyField label="IP Address" value={instance.ip} />
        <CopyField label="Username" value={instance.username} />
        <CopyField label="Password" value={instance.password} />
        <CopyField label="Port" value={instance.port} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <div className="text-xs text-stone-500">RAM used</div>
          <div className="mt-1 font-mono text-lg text-stone-100">
            {usage ? `${usage.ram_used_mb} / ${instance.ram_mb} MB` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <div className="text-xs text-stone-500">CPU used</div>
          <div className="mt-1 font-mono text-lg text-stone-100">{usage ? `${usage.cpu_used_pct}%` : "—"}</div>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <div className="text-xs text-stone-500">Disk used</div>
          <div className="mt-1 font-mono text-lg text-stone-100">{usage ? `${usage.disk_used_gb} GB` : "—"}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {instance.status === "running" ? (
          <Button variant="subtle" disabled={busy} onClick={() => action(() => api.post(`/instances/${id}/stop`), "Instance stopped")}>
            Stop
          </Button>
        ) : (
          <Button
            disabled={busy || instance.status === "suspended"}
            onClick={() => action(() => api.post(`/instances/${id}/start`), "Instance started")}
          >
            Start
          </Button>
        )}
        <Button variant="ghost" onClick={() => setReinstallOpen(true)} disabled={busy}>
          Reinstall
        </Button>
        <Button variant="ghost" onClick={() => setPasswordOpen(true)} disabled={busy}>
          Change Password
        </Button>
        <Button variant="ghost" onClick={() => setHostnameOpen(true)} disabled={busy}>
          Change Hostname
        </Button>
        <Button variant="danger" onClick={doDelete} disabled={busy}>
          Delete
        </Button>
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-sm text-stone-500">
        Billed at <span className="font-mono text-moss-300">{instance.hourly_cost.toFixed(4)}</span> credits/hour while running.
        {instance.os} · {instance.cpu}
      </div>

      <Modal open={reinstallOpen} onClose={() => setReinstallOpen(false)} title="Reinstall OS">
        <p className="mb-4 text-sm text-stone-400">
          This will wipe the instance and reinstall it with the selected operating system.
        </p>
        <Field label="Operating system">
          <Select value={reinstallOs} onChange={(e) => setReinstallOs(e.target.value)}>
            {OS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setReinstallOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              await action(() => api.post(`/instances/${id}/reinstall`, { os: reinstallOs }), "Instance reinstalled");
              setReinstallOpen(false);
            }}
          >
            Reinstall
          </Button>
        </div>
      </Modal>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password">
        <Field label="New root password">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || newPassword.length < 4}
            onClick={async () => {
              await action(() => api.post(`/instances/${id}/password`, { password: newPassword }), "Password updated");
              setNewPassword("");
              setPasswordOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={hostnameOpen} onClose={() => setHostnameOpen(false)} title="Change Hostname">
        <Field label="New hostname">
          <Input value={newHostname} onChange={(e) => setNewHostname(e.target.value)} placeholder="server.local" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setHostnameOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !newHostname}
            onClick={async () => {
              await action(() => api.post(`/instances/${id}/hostname`, { hostname: newHostname }), "Hostname updated");
              setHostnameOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
