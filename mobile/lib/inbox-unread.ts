import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { onPushReceived } from "@/lib/push";
import { useAuth } from "@/lib/auth-context";

export function useInboxUnread() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const data = await api<{ unreadTotal?: number }>("/api/dm");
      setUnread(data.unreadTotal ?? 0);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    const stop = onPushReceived(() => void load());
    return () => {
      clearInterval(id);
      stop();
    };
  }, [load]);

  return unread;
}
