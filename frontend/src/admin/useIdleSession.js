import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const IDLE_LIMIT = 29 * 60 * 1000;
const WARN_AT = 25 * 60 * 1000;
const REFRESH_EVERY = 5 * 60 * 1000;
const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

export const useIdleSession = (active, onExpire) => {
  const lastActivity = useRef(Date.now());
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    if (!active) return undefined;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const interceptor = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401) onExpire();
        return Promise.reject(err);
      },
    );
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current > IDLE_LIMIT) {
        onExpire();
      } else if (now - lastActivity.current > WARN_AT) {
        toast.warning("You will be signed out soon due to inactivity. Move the mouse or press a key to stay signed in.", { id: "idle-warning" });
      } else if (now - lastRefresh.current > REFRESH_EVERY && now - lastActivity.current < REFRESH_EVERY) {
        lastRefresh.current = now;
        api.get("/admin-auth/session").then((r) => !r.data?.authenticated && onExpire()).catch(() => {});
      }
    }, 30000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
      api.interceptors.response.eject(interceptor);
      clearInterval(timer);
    };
  }, [active, onExpire]);
};
