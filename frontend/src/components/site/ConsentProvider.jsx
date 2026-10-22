import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SITE } from "@/config/site";

const KEY = "mv_consent";
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000;

const read = () => {
  try {
    const record = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!record || record.version !== SITE.cookiePolicyVersion) return null;
    if (Date.now() - new Date(record.timestamp).getTime() > MAX_AGE_MS) return null;
    return record;
  } catch {
    return null;
  }
};

const ConsentContext = createContext({ consent: null, save: () => {}, settingsOpen: false, openSettings: () => {}, closeSettings: () => {} });

export const ConsentProvider = ({ children }) => {
  const [consent, setConsent] = useState(read);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const save = useCallback((prefs) => {
    const record = {
      version: SITE.cookiePolicyVersion,
      timestamp: new Date().toISOString(),
      prefs: { necessary: true, preferences: !!prefs.preferences, analytics: !!prefs.analytics, marketing: !!prefs.marketing },
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(record));
    } catch {
      /* storage blocked: keep the choice for this page view only */
    }
    setConsent(record);
    setSettingsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ consent, save, settingsOpen, openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false) }),
    [consent, save, settingsOpen],
  );
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};

export const useConsent = () => useContext(ConsentContext);
