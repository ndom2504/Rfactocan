import { ensureMissingMemberCodes } from "../lib/member-code";
import { prisma } from "../lib/prisma";

async function main() {
  let assigned = 0;
  for (;;) {
    const batch = await ensureMissingMemberCodes(200);
    assigned += batch;
    if (batch === 0) break;
  }
  const total = await prisma.user.count({
    where: { memberCode: { not: null } },
  });
  console.log(JSON.stringify({ assigned, total }));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
