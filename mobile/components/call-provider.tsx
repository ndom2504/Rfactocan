import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import {
  type ActiveCall,
  fetchCall,
  fetchInboundRinging,
} from "@/lib/calls";
import { onIncomingCallPush } from "@/lib/push";

const CallContext = createContext<{
  startOutgoing: (call: ActiveCall) => void;
} | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveCall | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);
  activeRef.current = active;

  const startOutgoing = useCallback((call: ActiveCall) => {
    setActive({ ...call, direction: call.direction || "outbound" });
  }, []);
  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
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
    const timer = setInterval(() => void poll(), 2500);
    const stopPush = onIncomingCallPush((payload) => {
      if (activeRef.current) return;
      void (async () => {
        const fromId = payload.callId
          ? await fetchCall(payload.callId)
          : await fetchInboundRinging();
        if (fromId && fromId.status === "RINGING" && !activeRef.current) {
          setActive({ ...fromId, direction: "inbound" });
        }
      })();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      stopPush();
    };
  }, [user]);

  return (
    <CallContext.Provider value={{ startOutgoing }}>
      {children}
      {active ? (
        <CallOverlayHost call={active} onUpdate={setActive} onClose={close} />
      ) : null}
    </CallContext.Provider>
  );
}

function CallOverlayHost({
  call,
  onUpdate,
  onClose,
}: {
  call: ActiveCall;
  onUpdate: (call: ActiveCall) => void;
  onClose: () => void;
}) {
  // LiveKit stays behind require() so Expo Go can still show ringing UI.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CallOverlay } = require("./call-overlay") as typeof import("./call-overlay");
  return <CallOverlay call={call} onUpdate={onUpdate} onClose={onClose} />;
}

export function useCallActions() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCallActions must be used within CallProvider");
  }
  return ctx;
}
