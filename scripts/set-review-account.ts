/**
 * Upsert the Apple TestFlight review user (no OTP on login).
 * Usage: npx tsx scripts/set-review-account.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { APPLE_REVIEW_EMAIL } from "../lib/review-account";

const prisma = new PrismaClient();
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD?.trim() || "Test2026";

async function main() {
  if (REVIEW_PASSWORD.length < 8) {
    throw new Error("REVIEW_PASSWORD doit faire au moins 8 caractères.");
  }

  const passwordHash = await bcrypt.hash(REVIEW_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: APPLE_REVIEW_EMAIL },
    update: {
      passwordHash,
      role: "BOTH",
      status: "ACTIVE",
      verifiedAt: new Date(),
      displayName: "Testeur Apple",
    },
    create: {
      email: APPLE_REVIEW_EMAIL,
      passwordHash,
      displayName: "Testeur Apple",
      role: "BOTH",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      language: "fr",
      preferredCurrency: "CAD",
      bio: "Compte de revue App Store / TestFlight.",
    },
  });

  console.log("Compte revue prêt :", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
