import { NextRequest } from "next/server";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const rows = month
    ? await db.select().from(budgets).where(eq(budgets.month, month))
    : await db.select().from(budgets);
  return Response.json({ budgets: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, amount, month } = body;

    if (!category || typeof category !== "string") {
      return Response.json({ error: "Category required" }, { status: 400 });
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: "Invalid month" }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (amt === 0) {
      await db
        .delete(budgets)
        .where(and(eq(budgets.month, month), eq(budgets.category, category)));
      return Response.json({ ok: true, deleted: true });
    }

    // Upsert
    const existing = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.month, month), eq(budgets.category, category)));

    if (existing.length > 0) {
      const [row] = await db
        .update(budgets)
        .set({ amount: amt.toFixed(2) })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      return Response.json({ budget: row });
    }

    const [row] = await db
      .insert(budgets)
      .values({ category, amount: amt.toFixed(2), month })
      .returning();
    return Response.json({ budget: row });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
