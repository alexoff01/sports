import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, errorMessage } from "@/lib/api";

export const MessagesPanel = () => {
  const [messages, setMessages] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/messages");
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load messages."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    try {
      await api.delete(`/admin/messages/${id}`);
      setMessages((m) => m.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const validSender = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sender.trim());

  const exportSender = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/messages/export", { email: sender.trim() });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-export-${data.email.replace(/[^a-z0-9]+/gi, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.count} message(s)`);
    } catch (err) {
      toast.error(errorMessage(err, "Export failed."));
    } finally {
      setBusy(false);
    }
  };

  const eraseSender = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/messages/erase", { email: sender.trim() });
      toast.success(`Deleted ${data.deleted} message(s) permanently`);
      setSender("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Deletion failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="inbox-title" data-testid="admin-inbox">
      <h1 id="inbox-title" className="t-h2">Inbox</h1>
      <p className="mt-2 text-sm text-slate-400">Messages are deleted automatically after the retention period (default 12 months).</p>
      <div className="mt-6 border border-line bg-ink-900 p-5" data-testid="privacy-requests">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.08em]">Privacy requests (GDPR)</h2>
        <p className="mt-1 text-sm text-slate-400">Answer an access or erasure request for everything a sender has submitted. Reply within one month.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="sender-email" className="sr-only">Sender email</label>
          <input id="sender-email" type="email" autoComplete="off" placeholder="sender@example.com" className="field sm:max-w-sm" value={sender} onChange={(e) => setSender(e.target.value)} data-testid="privacy-sender-input" />
          <button type="button" disabled={!validSender || busy} onClick={exportSender} className="inline-flex min-h-[48px] items-center justify-center border border-line px-4 text-sm font-semibold hover:border-volt disabled:opacity-40" data-testid="privacy-export-btn">Export (JSON)</button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" disabled={!validSender || busy} className="inline-flex min-h-[48px] items-center justify-center border border-red-400/50 px-4 text-sm font-semibold text-red-200 hover:border-red-400 disabled:opacity-40" data-testid="privacy-erase-btn">Delete all from sender</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-sm border-line-strong bg-ink-900">
              <AlertDialogTitle>Delete every message from {sender.trim()}?</AlertDialogTitle>
              <AlertDialogDescription>This permanently removes all messages and personal details from this sender. It cannot be undone.</AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={eraseSender} className="bg-red-600 hover:bg-red-500" data-testid="privacy-erase-confirm">Delete permanently</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {messages.length === 0 && <p className="mt-8 text-slate-300">No messages yet.</p>}
      <ul className="mt-8 space-y-4">
        {messages.map((m) => (
          <li key={m.id} className="border border-line bg-ink-900 p-6" data-testid="admin-message-item">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{m.name} <span className="font-normal text-slate-400">· {m.email}</span> <button type="button" onClick={() => setSender(m.email)} className="ml-1 text-xs font-normal text-volt-bright underline-offset-4 hover:underline" data-testid="privacy-use-sender">use for privacy request</button></p>
                <p className="text-xs uppercase tracking-[0.16em] text-volt-bright">{m.inquiry_type} · {new Date(m.created_at).toLocaleString()} {m.delivered ? "" : "· email not delivered"}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" aria-label="Delete message" className="grid h-11 w-11 place-items-center border border-line hover:border-red-400" data-testid="admin-message-delete"><Trash2 className="h-4 w-4" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-sm border-line-strong bg-ink-900">
                  <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes the message and the sender&apos;s details.</AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(m.id)} className="bg-red-600 hover:bg-red-500">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="mt-4 whitespace-pre-line text-slate-200">{m.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};
