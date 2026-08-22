"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CallOverlay } from "@/components/call-overlay";
import {
  type ActiveCall,
  fetchInboundRinging,
} from "@/lib/call-client";

const CallContext = createContext<{
  startOutgoing: (call: ActiveCall) => void;
} | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveCall | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);
  activeRef.current = active;

  const startOutgoing = useCallback((call: ActiveCall) => {
    setActive({ ...call, direction: call.direction || "outbound" });
  }, []);
  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (activeRef.current) return;
      try {
        const inbound = await fetchInboundRinging();
        if (!cancelled && inbound && !activeRef.current) {
          setActive({ ...inbound, direction: "inbound" });
        }
      } catch {
        /* keep polling */
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <CallContext.Provider value={{ startOutgoing }}>
      {children}
      {active ? (
        <CallOverlay
          call={active}
          onUpdate={setActive}
          onClose={close}
        />
      ) : null}
    </CallContext.Provider>
  );
}

export function useCallActions() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCallActions must be used within CallProvider");
  }
  return ctx;
}
