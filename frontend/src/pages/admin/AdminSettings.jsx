import { useEffect, useState } from "react";
import { Field, Input, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    const res = await api.get("/admin/settings");
    setSettings(res.settings);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) =>
    setSettings((s) => ({ ...s, [key]: e.target.type === "checkbox" ? String(e.target.checked) : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/settings", settings);
      toast.push("Settings saved", "success");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="text-sm text-stone-500">Loading…</div>;

  return (
    <form onSubmit={save} className="grid max-w-3xl gap-6">
      <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-stone-100">General</h3>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Site name">
            <Input value={settings.site_name} onChange={update("site_name")} />
          </Field>
          <Field label="Default starting credits">
            <Input type="number" value={settings.default_starting_credits} onChange={update("default_starting_credits")} />
          </Field>
        </div>
        <Field label="Support Discord invite link">
          <Input value={settings.support_discord} onChange={update("support_discord")} />
        </Field>
      </section>

      <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-stone-100">Maintenance mode</h3>
        <label className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.maintenance_mode === "true"}
            onChange={update("maintenance_mode")}
            className="h-4 w-4 rounded border-stone-600 bg-stone-900 accent-moss-500"
          />
          <span className="text-sm text-stone-300">
            Enable maintenance mode (non-admin visitors will see a maintenance page)
          </span>
        </label>
        <Field label="Maintenance message">
          <textarea
            rows={3}
            value={settings.maintenance_message}
            onChange={update("maintenance_message")}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-moss-500 focus:ring-1 focus:ring-moss-500/50"
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <h3 className="mb-1 text-sm font-semibold text-stone-100">Mail / SMTP</h3>
        <p className="mb-4 text-xs text-stone-500">
          Used for verification codes, login OTPs, and broadcast emails. Leave host blank to log emails to the
          server console instead of sending them (useful for testing).
        </p>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="SMTP host">
            <Input value={settings.smtp_host} onChange={update("smtp_host")} placeholder="smtp.example.com" />
          </Field>
          <Field label="SMTP port">
            <Input value={settings.smtp_port} onChange={update("smtp_port")} placeholder="587" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="SMTP username">
            <Input value={settings.smtp_user} onChange={update("smtp_user")} />
          </Field>
          <Field label="SMTP password" hint="Leave blank to keep the current password">
            <Input type="password" value={settings.smtp_pass} onChange={update("smtp_pass")} placeholder="••••••••" />
          </Field>
        </div>
        <Field label="From address">
          <Input value={settings.smtp_from} onChange={update("smtp_from")} placeholder='"StoneNodes" <no-reply@example.com>' />
        </Field>
      </section>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
