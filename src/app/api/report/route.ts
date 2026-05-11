import { NextRequest } from "next/server";
import { buildMonthlyReport, previousMonth } from "@/lib/report";
import { generateSuggestions } from "@/lib/ai";
import { currentMonth } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || currentMonth();

  const [report, prev] = await Promise.all([
    buildMonthlyReport(month),
    buildMonthlyReport(previousMonth(month)),
  ]);

  const suggestions = generateSuggestions({
    month,
    income: report.income,
    expenses: report.expenses,
    byCategory: report.byCategory,
    byCategoryLastMonth: prev.byCategory,
    budgets: report.budgets,
    daysElapsed: report.daysElapsed,
    daysInMonth: report.daysInMonth,
  });

  return Response.json({
    report,
    previousMonth: {
      month: prev.month,
      income: prev.income,
      expenses: prev.expenses,
      net: prev.net,
      byCategory: prev.byCategory,
    },
    suggestions,
  });
}
