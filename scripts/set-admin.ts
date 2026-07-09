/**
 * Upsert the platform admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
 * Usage: npx tsx scripts/set-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans .env puis relancez."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD doit faire au moins 8 caractères.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const legacyEmail = "admin@rfacto.ca";

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      verifiedAt: new Date(),
      displayName: "Admin Rfacto",
    },
    create: {
      email,
      passwordHash,
      displayName: "Admin Rfacto",
      role: "ADMIN",
      status: "ACTIVE",
      verifiedAt: new Date(),
      country: "Canada",
      language: "fr",
      preferredCurrency: "CAD",
      bio: "Administrateur de la plateforme Rfacto.",
    },
  });

  // Demote the old demo admin if it is a different account
  if (email !== legacyEmail) {
    const legacy = await prisma.user.findUnique({ where: { email: legacyEmail } });
    if (legacy && legacy.role === "ADMIN") {
      await prisma.user.update({
        where: { email: legacyEmail },
        data: { role: "BOTH" },
      });
      console.log(`Ancien admin ${legacyEmail} rétrogradé en BOTH.`);
    }
  }

  console.log("Admin prêt :", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
  console.log("Connectez-vous sur /login avec cet email et ADMIN_PASSWORD.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
