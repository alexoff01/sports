import { Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const IdleWarning = ({ secondsLeft, onStay, onLogout }) => (
  <AlertDialog open={secondsLeft !== null}>
    <AlertDialogContent className="rounded-sm border-line-strong bg-ink-900" data-testid="admin-idle-warning">
      <AlertDialogTitle className="flex items-center gap-2 font-display text-xl uppercase tracking-[0.08em]">
        <Clock className="h-5 w-5 text-volt-bright" aria-hidden="true" />Still there?
      </AlertDialogTitle>
      <AlertDialogDescription className="text-slate-300">
        For your security you will be signed out in <span className="font-mono text-paper" data-testid="admin-idle-countdown">{fmt(secondsLeft ?? 0)}</span> because of inactivity.
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onLogout} data-testid="admin-idle-logout">Sign out now</AlertDialogCancel>
        <AlertDialogAction onClick={onStay} className="bg-volt hover:bg-volt-bright" data-testid="admin-idle-stay">Stay signed in</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
