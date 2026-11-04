import { ensureMemberCode } from "../lib/member-code";
import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, displayName: true, memberCode: true },
    orderBy: { createdAt: "asc" },
  });
  let updated = 0;
  for (const user of users) {
    const next = await ensureMemberCode(user.id);
    if (next && next !== user.memberCode) updated += 1;
  }
  const sample = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      NOT: { email: { endsWith: "@rfacto.local" } },
    },
    select: { displayName: true, memberCode: true },
    orderBy: { createdAt: "asc" },
    take: 8,
  });
  console.log(JSON.stringify({ users: users.length, updated, sample }));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
