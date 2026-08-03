import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Download a CSV of user emails for closed beta / Play Console & App Store test lists.
 * Columns: email only (one address per line after header).
 */
export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      email: { not: "" },
      status: { not: "SUSPENDED" },
    },
    select: { email: true },
    orderBy: { email: "asc" },
  });

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const u of users) {
    const e = (u.email || "").trim().toLowerCase();
    if (!e || !e.includes("@") || seen.has(e)) continue;
    seen.add(e);
    emails.push(e);
  }

  const lines = ["email", ...emails.map((e) => csvEscape(e))];
  const csv = lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `rfacto-users-emails-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
