import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [slotModal, setSlotModal] = useState(null);
  const [slotLimit, setSlotLimit] = useState("");
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/users");
    setUsers(res.users);
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
        <div className="text-sm text-stone-500">Loading users…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-900/70 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">VPS</th>
                <th className="px-4 py-3 font-medium">Slot limit</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {users.map((u) => (
                <tr key={u.id} className="bg-stone-900/30 hover:bg-stone-900/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-100">{u.username}</div>
                    <div className="text-xs text-stone-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-stone-300">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                        u.status === "active"
                          ? "border-moss-500/30 bg-moss-500/10 text-moss-300"
                          : u.status === "suspended"
                          ? "border-red-800/50 bg-red-950/40 text-red-300"
                          : "border-stone-600 bg-stone-700/30 text-stone-300"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-300">{u.credits.toFixed(2)}</td>
                  <td className="px-4 py-3 text-stone-300">{u.vps_count}</td>
                  <td className="px-4 py-3 text-stone-300">{u.vps_slot_limit}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.status === "suspended" ? (
                        <Button
                          variant="subtle"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => doAction(() => api.post(`/admin/users/${u.id}/unsuspend`), "User unsuspended")}
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => doAction(() => api.post(`/admin/users/${u.id}/suspend`), "User suspended")}
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          setCreditModal(u);
                          setCreditAmount("");
                        }}
                      >
                        Credits
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          setSlotModal(u);
                          setSlotLimit(String(u.vps_slot_limit));
                        }}
                      >
                        Slots
                      </Button>
                      {u.role !== "admin" && (
                        <Button
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => doAction(() => api.post(`/admin/users/${u.id}/promote`), "User promoted to admin")}
                        >
                          Promote
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          if (confirm(`Delete ${u.username}? This deletes all their VPS instances too.`)) {
                            doAction(() => api.del(`/admin/users/${u.id}`), "User deleted");
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

      <Modal open={!!creditModal} onClose={() => setCreditModal(null)} title={`Adjust credits — ${creditModal?.username}`}>
        <Field label="Amount" hint="Positive to add, negative to remove">
          <Input type="number" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="e.g. 50 or -10" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCreditModal(null)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await doAction(
                () => api.post(`/admin/users/${creditModal.id}/credits`, { amount: Number(creditAmount) }),
                "Balance updated"
              );
              setCreditModal(null);
            }}
          >
            Apply
          </Button>
        </div>
      </Modal>

      <Modal open={!!slotModal} onClose={() => setSlotModal(null)} title={`VPS slot limit — ${slotModal?.username}`}>
        <Field label="Max instances">
          <Input type="number" min="0" value={slotLimit} onChange={(e) => setSlotLimit(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setSlotModal(null)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await doAction(
                () => api.post(`/admin/users/${slotModal.id}/slot-limit`, { limit: Number(slotLimit) }),
                "Slot limit updated"
              );
              setSlotModal(null);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
