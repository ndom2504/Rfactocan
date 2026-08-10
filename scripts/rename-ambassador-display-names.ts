/**
 * Rename displayName / bio that still say « Ambassadeur » → « Héraut Réseau ».
 *
 *   npx tsx scripts/rename-ambassador-display-names.ts
 *   npx tsx scripts/rename-ambassador-display-names.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function rewrite(text: string | null | undefined): string | null {
  if (!text) return null;
  let out = text;
  // Specific common labels first
  out = out.replace(/\bPlayPlay\s+Ambassadeur\b/gi, "PlayPlay Héraut Réseau");
  out = out.replace(/\bAmbassadeur\s+Rfacto\b/gi, "Héraut Réseau Rfacto");
  out = out.replace(/\bAmbassador\s+Rfacto\b/gi, "Network Herald Rfacto");
  out = out.replace(/\bambassadeurs?\b/gi, (m) =>
    m.startsWith("A") && m === m.toUpperCase()
      ? "HERAUTS RESEAU"
      : m[0] === "A"
        ? "Héraut Réseau"
        : "héraut réseau"
  );
  out = out.replace(/\bambassadors?\b/gi, (m) =>
    m[0] === "A" ? "Network Herald" : "network herald"
  );
  // French plural cleanup after partial replaces
  out = out.replace(/Héraut Réseaux/gi, "Hérauts Réseau");
  return out;
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { displayName: { contains: "Ambassadeur", mode: "insensitive" } },
        { displayName: { contains: "Ambassador", mode: "insensitive" } },
        { bio: { contains: "Ambassadeur", mode: "insensitive" } },
        { bio: { contains: "Ambassador", mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, displayName: true, bio: true },
  });

  console.log(`${users.length} compte(s) à réviser${dryRun ? " (dry-run)" : ""}`);

  for (const u of users) {
    const displayName = rewrite(u.displayName) ?? u.displayName;
    const bio = rewrite(u.bio);
    if (displayName === u.displayName && bio === u.bio) {
      console.log(`- skip ${u.email} (aucune transformation)`);
      continue;
    }
    console.log(`- ${u.email}`);
    console.log(`    displayName: ${u.displayName} → ${displayName}`);
    if (u.bio !== bio) console.log(`    bio: ${u.bio ?? "—"} → ${bio ?? "—"}`);
    if (!dryRun) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          displayName,
          ...(bio !== u.bio ? { bio } : {}),
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
