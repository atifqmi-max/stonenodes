import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Select, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminNodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "remote", apiUrl: "", apiKey: "", vpsLimit: 50 });
  const [limitModal, setLimitModal] = useState(null);
  const [limitValue, setLimitValue] = useState("");
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/nodes");
    setNodes(res.nodes);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const doAction = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast.push(msg, "success");
      await load();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    await doAction(() => api.post("/admin/nodes", form), "Node created");
    setCreateOpen(false);
    setForm({ name: "", type: "remote", apiUrl: "", apiKey: "", vpsLimit: 50 });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>+ Add Node</Button>
      </div>

      {loading ? (
        <div className="text-sm text-stone-500">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {nodes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-stone-100">{n.name}</div>
                  <div className="text-xs uppercase tracking-wide text-stone-500">{n.type} node</div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    n.status === "active"
                      ? "border-moss-500/30 bg-moss-500/10 text-moss-300"
                      : "border-stone-600 bg-stone-700/30 text-stone-400"
                  }`}
                >
                  {n.status}
                </span>
              </div>
              <div className="mb-4 text-sm text-stone-400">
                {n.instance_count} / {n.vps_limit} instances
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => {
                    setLimitModal(n);
                    setLimitValue(String(n.vps_limit));
                  }}
                >
                  Set limit
                </Button>
                <Button
                  variant="subtle"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => doAction(() => api.post(`/admin/nodes/${n.id}/toggle`))}
                >
                  {n.status === "active" ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="danger"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => {
                    if (confirm(`Delete node "${n.name}"?`)) doAction(() => api.del(`/admin/nodes/${n.id}`), "Node deleted");
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Node">
        <form onSubmit={submitCreate}>
          <Field label="Node name">
            <Input required value={form.name} onChange={update("name")} placeholder="US-East 01" />
          </Field>
          <Field label="Node type">
            <Select value={form.type} onChange={update("type")}>
              <option value="remote">Remote (provisioning agent)</option>
              <option value="local">Local (this host)</option>
            </Select>
          </Field>
          {form.type === "remote" && (
            <>
              <Field label="API URL">
                <Input required value={form.apiUrl} onChange={update("apiUrl")} placeholder="https://node-agent.example.com" />
              </Field>
              <Field label="API Key">
                <Input value={form.apiKey} onChange={update("apiKey")} placeholder="secret key" />
              </Field>
            </>
          )}
          <Field label="VPS generation limit">
            <Input type="number" min="1" value={form.vpsLimit} onChange={update("vpsLimit")} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create node</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!limitModal} onClose={() => setLimitModal(null)} title={`Set limit — ${limitModal?.name}`}>
        <Field label="Max VPS instances on this node">
          <Input type="number" min="0" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setLimitModal(null)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await doAction(() => api.post(`/admin/nodes/${limitModal.id}/limit`, { limit: Number(limitValue) }), "Limit updated");
              setLimitModal(null);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
