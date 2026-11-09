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

  return (
    <section aria-labelledby="inbox-title" data-testid="admin-inbox">
      <h1 id="inbox-title" className="t-h2">Inbox</h1>
      <p className="mt-2 text-sm text-slate-400">Messages are deleted automatically after 12 months.</p>
      {messages.length === 0 && <p className="mt-8 text-slate-300">No messages yet.</p>}
      <ul className="mt-8 space-y-4">
        {messages.map((m) => (
          <li key={m.id} className="border border-line bg-ink-900 p-6" data-testid="admin-message-item">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{m.name} <span className="font-normal text-slate-400">· {m.email}</span></p>
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
