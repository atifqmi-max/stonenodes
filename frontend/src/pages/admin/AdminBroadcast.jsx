import { useState } from "react";
import { Field, Input, Button } from "../../components/Form";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function AdminBroadcast() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!confirm("Send this message to every registered member's email?")) return;
    setSending(true);
    try {
      const res = await api.post("/admin/broadcast", { subject, message });
      toast.push(`Sent to ${res.sent} members${res.failed ? `, ${res.failed} failed` : ""}`, "success");
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg">
      <form onSubmit={submit} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Scheduled maintenance this weekend" />
        </Field>
        <Field label="Message">
          <textarea
            required
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement…"
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-moss-500 focus:ring-1 focus:ring-moss-500/50"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Sending…" : "Send to all members"}
        </Button>
      </form>
    </div>
  );
}
