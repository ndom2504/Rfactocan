import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isGoogleReturnUrl } from "@/lib/google-auth-url";

/**
 * Leftover Expo Go deep links must never log the user back in after logout.
 * Bounce off google-auth / ticket URLs only.
 */
export function GoogleReturnHandler() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    function bounce(url: string | null) {
      if (!url || !isGoogleReturnUrl(url)) return;
      router.replace(user ? "/(tabs)" : "/");
    }

    void Linking.getInitialURL().then(bounce);
    const sub = Linking.addEventListener("url", (event) => bounce(event.url));
    return () => sub.remove();
  }, [loading, user, router]);

  return null;
}
