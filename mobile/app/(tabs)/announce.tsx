import { useRouter } from "expo-router";
import { AnnounceComposer } from "@/components/announce-composer";
import { Screen } from "@/components/ui";

export default function AnnounceScreen() {
  const router = useRouter();
  return (
    <Screen>
      <AnnounceComposer
        onPublished={() => router.replace("/(tabs)/community")}
      />
    </Screen>
  );
}
