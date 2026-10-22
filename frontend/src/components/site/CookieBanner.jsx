import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "@/components/site/ConsentProvider";

const BTN = "min-h-[46px] w-full rounded-sm border border-line-strong bg-ink-800 px-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-colors duration-300 hover:border-volt hover:bg-volt";

const CATEGORIES = [
  { id: "necessary", title: "Strictly necessary", text: "Stores your cookie choice and basic site settings. Always active because the site cannot work properly without it.", locked: true },
  { id: "preferences", title: "Preferences", text: "Would remember optional display preferences. Not currently used on this site." },
  { id: "analytics", title: "Analytics", text: "Would measure visits anonymously to improve the site. No analytics tool is currently installed." },
  { id: "marketing", title: "Marketing", text: "Would allow advertising or tracking cookies. Not used on this site." },
];

const EMPTY = { preferences: false, analytics: false, marketing: false };

export const CookieBanner = () => {
  const { consent, save, settingsOpen, openSettings, closeSettings } = useConsent();
  const [prefs, setPrefs] = useState(EMPTY);

  useEffect(() => {
    if (settingsOpen) setPrefs({ ...EMPTY, ...(consent?.prefs ?? {}) });
  }, [settingsOpen, consent]);

  const all = (value) => save({ preferences: value, analytics: value, marketing: value });

  return (
    <>
      <AnimatePresence>
        {!consent && !settingsOpen && (
          <motion.section
            role="region"
            aria-labelledby="cookie-banner-title"
            data-testid="cookie-banner"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-3 z-[70] border border-line-strong bg-ink-900/95 p-5 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md"
          >
            <h2 id="cookie-banner-title" className="font-display text-xl font-bold uppercase tracking-wide">Your privacy choices</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              This site uses only strictly necessary storage by default. Optional categories stay off unless you allow them. Read the{" "}
              <Link to="/cookie-policy" className="text-volt-bright underline underline-offset-4">Cookie Policy</Link>.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" className={BTN} onClick={() => all(false)} data-testid="cookie-reject-all-btn">Reject all</button>
              <button type="button" className={BTN} onClick={openSettings} data-testid="cookie-customize-btn">Customize</button>
              <button type="button" className={BTN} onClick={() => all(true)} data-testid="cookie-accept-all-btn">Accept all</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <Dialog open={settingsOpen} onOpenChange={(o) => (o ? openSettings() : closeSettings())}>
        <DialogContent data-testid="cookie-settings-dialog" className="max-h-[90vh] overflow-y-auto rounded-sm border-line-strong bg-ink-900 sm:max-w-lg">
          <DialogTitle className="font-display text-2xl font-bold uppercase">Cookie settings</DialogTitle>
          <DialogDescription className="text-sm text-slate-300">Choose which optional categories you allow. You can change this at any time from the footer.</DialogDescription>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {CATEGORIES.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <label htmlFor={`consent-${c.id}`} className="font-semibold text-paper">{c.title}</label>
                  <p className="mt-1 text-sm text-slate-400">{c.text}</p>
                </div>
                <Switch
                  id={`consent-${c.id}`}
                  data-testid={`cookie-toggle-${c.id}`}
                  checked={c.locked ? true : prefs[c.id]}
                  disabled={c.locked}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [c.id]: v }))}
                  className="mt-1 data-[state=checked]:bg-volt"
                />
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" className={BTN} onClick={() => all(false)} data-testid="cookie-dialog-reject-btn">Reject all</button>
            <button type="button" className={BTN} onClick={() => save(prefs)} data-testid="cookie-dialog-save-btn">Save choices</button>
            <button type="button" className={BTN} onClick={() => all(true)} data-testid="cookie-dialog-accept-btn">Accept all</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
