import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Server idle timeout is 30 minutes. Warn at 25, sign out just before 30.
const IDLE_LIMIT = 29.5 * 60 * 1000;
const WARN_AT = 25 * 60 * 1000;
const REFRESH_EVERY = 5 * 60 * 1000;
const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

export const useIdleSession = (active, onExpire) => {
  const lastActivity = useRef(Date.now());
  const lastRefresh = useRef(Date.now());
  const warning = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const ping = useCallback(() => {
    lastRefresh.current = Date.now();
    api.get("/admin-auth/session").then((r) => !r.data?.authenticated && onExpire()).catch(() => {});
  }, [onExpire]);

  const stay = useCallback(() => {
    lastActivity.current = Date.now();
    warning.current = false;
    setSecondsLeft(null);
    ping();
  }, [ping]);

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null);
      return undefined;
    }
    lastActivity.current = Date.now();
    const mark = () => {
      if (!warning.current) lastActivity.current = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const interceptor = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401 && !String(err.config?.url ?? "").includes("/admin-auth/")) onExpire();
        return Promise.reject(err);
      },
    );
    const tick = () => {
      const now = Date.now();
      const idleFor = now - lastActivity.current;
      if (idleFor > IDLE_LIMIT) {
        warning.current = false;
        setSecondsLeft(null);
        onExpire();
      } else if (idleFor > WARN_AT) {
        warning.current = true;
        setSecondsLeft(Math.max(0, Math.round((IDLE_LIMIT - idleFor) / 1000)));
      } else if (now - lastRefresh.current > REFRESH_EVERY && idleFor < REFRESH_EVERY) {
        ping();
      }
    };
    const timer = setInterval(tick, 1000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
      api.interceptors.response.eject(interceptor);
      clearInterval(timer);
    };
  }, [active, onExpire, ping]);

  return { secondsLeft, stay };
};
