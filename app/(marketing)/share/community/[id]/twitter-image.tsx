import { loadShareOgImage } from "@/lib/og-share-image";

export const runtime = "nodejs";
export const alt = "Publication Rfacto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const image = await loadShareOgImage(id);
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
