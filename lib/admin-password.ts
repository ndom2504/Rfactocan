import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateTempPassword() {
  const bytes = randomBytes(8);
  let raw = "";
  for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];
  return `Rf-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function restoreUserPassword(userId: string) {
  const temporaryPassword = generateTempPassword();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(temporaryPassword) },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
  return temporaryPassword;
}
