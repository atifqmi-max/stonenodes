import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

const emptyForm = { name: "", credits: "", price: "", description: "", buyLink: "" };

export default function AdminShop() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null); // null = closed, {} = create, {...item} = edit
  const [form, setForm] = useState(emptyForm);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    const res = await api.get("/admin/shop-items");
    setItems(res.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditItem({});
  };
  const openEdit = (item) => {
    setForm({
      name: item.name,
      credits: item.credits,
      price: item.price,
      description: item.description || "",
      buyLink: item.buy_link || ""
    });
    setEditItem(item);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editItem?.id) {
        await api.put(`/admin/shop-items/${editItem.id}`, form);
        toast.push("Item updated", "success");
      } else {
        await api.post("/admin/shop-items", form);
        toast.push("Item created", "success");
      }
      setEditItem(null);
      await load();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this shop item?")) return;
    await api.del(`/admin/shop-items/${id}`);
    toast.push("Item deleted", "success");
    await load();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>+ Add package</Button>
      </div>

      {loading ? (
        <div className="text-sm text-stone-500">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
              <div className="mb-1 text-sm text-stone-400">{item.name}</div>
              <div className="mb-2 font-mono text-xl font-semibold text-moss-300">{item.credits} credits</div>
              <div className="mb-3 text-sm text-stone-500">{item.description}</div>
              <div className="mb-4 text-lg font-semibold text-stone-100">{item.price}</div>
              <div className="flex gap-1.5">
                <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => remove(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={editItem?.id ? "Edit package" : "New package"}>
        <form onSubmit={submit}>
          <Field label="Name">
            <Input required value={form.name} onChange={update("name")} placeholder="Starter Pack" />
          </Field>
          <Field label="Credits">
            <Input required type="number" step="0.01" value={form.credits} onChange={update("credits")} placeholder="100" />
          </Field>
          <Field label="Price">
            <Input required value={form.price} onChange={update("price")} placeholder="$5.00" />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={update("description")} placeholder="Good for a couple of small VPS" />
          </Field>
          <Field label="Buy Now link" hint="Defaults to the Discord invite if left blank">
            <Input value={form.buyLink} onChange={update("buyLink")} placeholder="https://discord.gg/..." />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button type="submit">{editItem?.id ? "Save changes" : "Create package"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
