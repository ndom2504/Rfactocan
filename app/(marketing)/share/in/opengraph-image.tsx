import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Rfacto + In — le duo qui construit vos relations et votre réseau d’affaires";
export const contentType = "image/png";
export const size = { width: 1024, height: 1024 };

export default async function Image() {
  const bytes = await readFile(join(process.cwd(), "public/images/in/rfacto-in-ad.png"));
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
