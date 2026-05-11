import { db } from "@/db";
import { transactions, budgets } from "@/db/schema";
import { gte, lte, and } from "drizzle-orm";

export type MonthlyReport = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  byCategory: Record<string, number>; // expenses
  incomeByCategory: Record<string, number>;
  byDay: Array<{ day: number; income: number; expense: number }>;
  budgets: Record<string, number>;
  txCount: number;
  daysElapsed: number;
  daysInMonth: number;
};

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, daysInMonth: lastDay, year: y, monthNum: m };
}

export async function buildMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end, daysInMonth, year, monthNum } = monthBounds(month);

  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(gte(transactions.occurredOn, start), lte(transactions.occurredOn, end)),
    );

  const bRows = await db.select().from(budgets);
  const budgetMap: Record<string, number> = {};
  for (const b of bRows) {
    if (b.month === month) budgetMap[b.category] = Number(b.amount);
  }

  let income = 0;
  let expenses = 0;
  const byCategory: Record<string, number> = {};
  const incomeByCategory: Record<string, number> = {};
  const byDay: Array<{ day: number; income: number; expense: number }> = [];
  for (let i = 1; i <= daysInMonth; i++) {
    byDay.push({ day: i, income: 0, expense: 0 });
  }

  for (const t of txs) {
    const amt = Number(t.amount);
    const day = Number(String(t.occurredOn).slice(8, 10));
    if (t.type === "income") {
      income += amt;
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + amt;
      if (byDay[day - 1]) byDay[day - 1].income += amt;
    } else {
      expenses += amt;
      byCategory[t.category] = (byCategory[t.category] || 0) + amt;
      if (byDay[day - 1]) byDay[day - 1].expense += amt;
    }
  }

  // Days elapsed (cap at month length, also cap at today if current month)
  const today = new Date();
  let daysElapsed = daysInMonth;
  if (
    today.getFullYear() === year &&
    today.getMonth() + 1 === monthNum
  ) {
    daysElapsed = today.getDate();
  } else if (
    today.getFullYear() < year ||
    (today.getFullYear() === year && today.getMonth() + 1 < monthNum)
  ) {
    daysElapsed = 0;
  }

  return {
    month,
    income,
    expenses,
    net: income - expenses,
    byCategory,
    incomeByCategory,
    byDay,
    budgets: budgetMap,
    txCount: txs.length,
    daysElapsed,
    daysInMonth,
  };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
