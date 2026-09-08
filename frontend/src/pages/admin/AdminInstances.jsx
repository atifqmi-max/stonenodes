import { useEffect, useState } from "react";
import { Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminInstances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/instances");
    setInstances(res.instances);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const doAction = async (fn, msg) => {
    try {
      await fn();
      toast.push(msg, "success");
      await load();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <div>
      {loading ? (
        <div className="text-sm text-stone-500">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-900/70 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Instance</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Node</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Cost / hr</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {instances.map((i) => (
                <tr key={i.id} className="bg-stone-900/30 hover:bg-stone-900/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-100">{i.name}</div>
                    <div className="text-xs text-stone-500">
                      {i.os} · {i.cpu} · {i.ram_mb}MB
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-300">{i.owner_username}</div>
                    <div className="text-xs text-stone-500">{i.owner_email}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-300">{i.node_name}</td>
                  <td className="px-4 py-3 capitalize text-stone-300">{i.status}</td>
                  <td className="px-4 py-3 font-mono text-stone-300">{i.hourly_cost.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {i.status === "suspended" ? (
                        <Button
                          variant="subtle"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => doAction(() => api.post(`/admin/instances/${i.id}/unsuspend`), "Instance unsuspended")}
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => doAction(() => api.post(`/admin/instances/${i.id}/suspend`), "Instance suspended")}
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          if (confirm(`Delete instance "${i.name}"?`)) {
                            doAction(() => api.del(`/admin/instances/${i.id}`), "Instance deleted");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
