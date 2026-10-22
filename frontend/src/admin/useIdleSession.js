import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

const IDLE_LIMIT = 15 * 60 * 1000;
const REFRESH_EVERY = 10 * 60 * 1000;
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
      } else if (now - lastRefresh.current > REFRESH_EVERY) {
        lastRefresh.current = now;
        api.post("/admin/auth/refresh").catch(() => {});
      }
    }, 30000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
      api.interceptors.response.eject(interceptor);
      clearInterval(timer);
    };
  }, [active, onExpire]);
};
