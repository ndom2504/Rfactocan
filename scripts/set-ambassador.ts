/**
 * Nomme un utilisateur Héraut Réseau Rfacto (génère le code agent + lien).
 *
 * Usage:
 *   npx tsx scripts/set-ambassador.ts playplay@rfacto.com
 *   npx tsx scripts/set-ambassador.ts user@email.com --create --password=Secret123!
 *   AMBASSADOR_EMAIL=playplay@rfacto.com AMBASSADOR_PASSWORD=Secret123! npm run db:set-ambassador
 *
 * Compte démo Play / PlayPlay (si aucun email) :
 *   email    = playplay@rfacto.com
 *   password = PlayPlay123!  (uniquement si création)
 */
import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_EMAIL = "playplay@rfacto.com";
const DEFAULT_PASSWORD = "PlayPlay123!";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://www.rfacto.com"
  ).replace(/\/$/, "");
}

function randomCodeSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

async function generateAgentCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `RF-${randomCodeSegment(6)}`;
    const existing = await prisma.user.findUnique({
      where: { agentCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Impossible de générer un code agent unique");
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const passwordFlag = argv.find((a) => a.startsWith("--password="));
  return {
    emailArg: positional[0]?.trim().toLowerCase(),
    create: flags.has("--create") || Boolean(passwordFlag),
    password:
      passwordFlag?.slice("--password=".length) ||
      process.env.AMBASSADOR_PASSWORD ||
      undefined,
  };
}

async function main() {
  const { emailArg, create, password } = parseArgs(process.argv.slice(2));
  const email = (
    emailArg ||
    process.env.AMBASSADOR_EMAIL?.trim() ||
    DEFAULT_EMAIL
  ).toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!create && !process.env.AMBASSADOR_PASSWORD && email !== DEFAULT_EMAIL) {
      throw new Error(
        `Utilisateur introuvable: ${email}\n` +
          `Relancez avec --create --password=... ou créez le compte via /register.`
      );
    }
    const plain =
      password ||
      (email === DEFAULT_EMAIL ? DEFAULT_PASSWORD : undefined);
    if (!plain || plain.length < 8) {
      throw new Error(
        "Mot de passe requis (≥ 8 car.) pour créer le compte : --password=..."
      );
    }
    const isPlayPlay = email.includes("playplay");
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(plain, 10),
        displayName: isPlayPlay ? "PlayPlay Héraut Réseau" : email.split("@")[0]!,
        role: "BOTH",
        status: "ACTIVE",
        country: "Canada",
        language: "fr",
        preferredCurrency: "CAD",
        bio: isPlayPlay
          ? "Compte Héraut Réseau démo (Play / PlayPlay)."
          : "Héraut Réseau Rfacto.",
      },
    });
    console.log(`Compte créé : ${email}`);
  }

  const agentCode = user.agentCode ?? (await generateAgentCode());
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      isAmbassador: true,
      agentCode,
      status: "ACTIVE",
      // Corriger les anciens libellés démo restés « Ambassadeur »
      ...(user.displayName && /ambassad/i.test(user.displayName)
        ? {
            displayName: user.displayName
              .replace(/PlayPlay\s+Ambassadeur/gi, "PlayPlay Héraut Réseau")
              .replace(/Ambassadeur\s+Rfacto/gi, "Héraut Réseau Rfacto")
              .replace(/\bAmbassadeur\b/gi, "Héraut Réseau")
              .replace(/\bAmbassador\b/gi, "Network Herald"),
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      isAmbassador: true,
      agentCode: true,
      _count: { select: { referrals: true } },
    },
  });

  const inviteUrl = `${appUrl()}/register?ref=${encodeURIComponent(
    updated.agentCode!
  )}`;

  console.log("Héraut Réseau prêt :");
  console.log({
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    agentCode: updated.agentCode,
    inviteUrl,
    referrals: updated._count.referrals,
  });
  console.log("\nÀ partager aux filleuls :", inviteUrl);
  if (email === DEFAULT_EMAIL) {
    console.log(
      `\nConnexion démo PlayPlay : ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
