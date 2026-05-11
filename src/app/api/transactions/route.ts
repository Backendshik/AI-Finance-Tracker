import { NextRequest } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  const limit = Number(url.searchParams.get("limit") || 200);

  const where = [];
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0);
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    where.push(gte(transactions.occurredOn, start));
    where.push(lte(transactions.occurredOn, endStr));
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(limit);

  return Response.json({ transactions: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, amount, category, description, occurredOn } = body;

    if (!type || !["income", "expense"].includes(type)) {
      return Response.json({ error: "Invalid type" }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return Response.json({ error: "Amount must be positive" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return Response.json({ error: "Category required" }, { status: 400 });
    }
    const dateStr =
      typeof occurredOn === "string" && occurredOn
        ? occurredOn
        : new Date().toISOString().slice(0, 10);

    const [row] = await db
      .insert(transactions)
      .values({
        type,
        amount: amt.toFixed(2),
        category,
        description: typeof description === "string" ? description : "",
        occurredOn: dateStr,
      })
      .returning();

    return Response.json({ transaction: row });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
