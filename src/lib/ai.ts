import { getCategory, formatMoney } from "./categories";

export type Suggestion = {
  id: string;
  severity: "info" | "tip" | "warning" | "critical";
  title: string;
  message: string;
};

export type SpendingContext = {
  month: string;
  income: number;
  expenses: number;
  byCategory: Record<string, number>; // expense totals
  byCategoryLastMonth: Record<string, number>;
  budgets: Record<string, number>;
  daysElapsed: number;
  daysInMonth: number;
};

/**
 * Lightweight, deterministic "AI" engine that analyzes spending data
 * and produces personalized money-saving suggestions. Works without
 * external APIs so the app is fully functional out of the box.
 */
export function generateSuggestions(ctx: SpendingContext): Suggestion[] {
  const out: Suggestion[] = [];
  const {
    income,
    expenses,
    byCategory,
    byCategoryLastMonth,
    budgets,
    daysElapsed,
    daysInMonth,
  } = ctx;

  // 1. Savings rate
  if (income > 0) {
    const savingsRate = ((income - expenses) / income) * 100;
    if (savingsRate < 0) {
      out.push({
        id: "overspend",
        severity: "critical",
        title: "You're spending more than you earn",
        message: `You've spent ${formatMoney(
          expenses - income,
        )} more than your income this month. Consider pausing non-essential purchases like dining out, entertainment, or subscriptions until next pay cycle.`,
      });
    } else if (savingsRate < 10) {
      out.push({
        id: "low-savings",
        severity: "warning",
        title: "Savings rate is low",
        message: `You're only saving ${savingsRate.toFixed(
          1,
        )}% of your income. Aim for at least 20%. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`,
      });
    } else if (savingsRate >= 20) {
      out.push({
        id: "great-savings",
        severity: "info",
        title: "Great savings rate!",
        message: `You're saving ${savingsRate.toFixed(
          1,
        )}% of your income. Consider moving the surplus into a high-yield savings account or index fund.`,
      });
    }
  } else if (expenses > 0) {
    out.push({
      id: "no-income",
      severity: "warning",
      title: "No income recorded yet",
      message:
        "Add your monthly income so we can calculate your savings rate and give better recommendations.",
    });
  }

  // 2. Budget alerts (pace-aware)
  const pace = daysInMonth > 0 ? daysElapsed / daysInMonth : 1;
  for (const [cat, budget] of Object.entries(budgets)) {
    const spent = byCategory[cat] || 0;
    if (budget <= 0) continue;
    const pct = (spent / budget) * 100;
    const expectedPct = pace * 100;
    const meta = getCategory(cat);

    if (pct >= 100) {
      out.push({
        id: `over-${cat}`,
        severity: "critical",
        title: `Over budget on ${meta.label}`,
        message: `${meta.emoji} You've spent ${formatMoney(
          spent,
        )} of your ${formatMoney(budget)} budget (${pct.toFixed(
          0,
        )}%). Pause discretionary spending in this category for the rest of the month.`,
      });
    } else if (pct > expectedPct + 25 && pct >= 60) {
      out.push({
        id: `pace-${cat}`,
        severity: "warning",
        title: `Spending too fast on ${meta.label}`,
        message: `${meta.emoji} You've used ${pct.toFixed(
          0,
        )}% of your budget but only ${expectedPct.toFixed(
          0,
        )}% of the month has passed. Slow down to stay on track.`,
      });
    } else if (pct >= 80) {
      out.push({
        id: `near-${cat}`,
        severity: "warning",
        title: `Approaching budget limit: ${meta.label}`,
        message: `${meta.emoji} You're at ${pct.toFixed(
          0,
        )}% of your ${formatMoney(budget)} budget — only ${formatMoney(
          budget - spent,
        )} left.`,
      });
    }
  }

  // 3. Month-over-month spikes
  const spikes: { cat: string; current: number; prev: number; delta: number }[] = [];
  for (const [cat, current] of Object.entries(byCategory)) {
    const prev = byCategoryLastMonth[cat] || 0;
    if (prev > 20 && current > prev * 1.4) {
      spikes.push({ cat, current, prev, delta: current - prev });
    }
  }
  spikes.sort((a, b) => b.delta - a.delta);
  for (const s of spikes.slice(0, 2)) {
    const meta = getCategory(s.cat);
    out.push({
      id: `spike-${s.cat}`,
      severity: "tip",
      title: `${meta.label} spending jumped`,
      message: `${meta.emoji} You spent ${formatMoney(
        s.current,
      )} this month vs ${formatMoney(s.prev)} last month — a ${(
        ((s.current - s.prev) / s.prev) *
        100
      ).toFixed(0)}% increase. Review recent purchases for anything you could cut.`,
    });
  }

  // 4. Top category insight
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && expenses > 0) {
    const [topCat, topAmount] = sorted[0];
    const share = (topAmount / expenses) * 100;
    if (share >= 35) {
      const meta = getCategory(topCat);
      out.push({
        id: `top-${topCat}`,
        severity: "tip",
        title: `${meta.label} dominates your spending`,
        message: `${meta.emoji} ${meta.label} is ${share.toFixed(
          0,
        )}% of your expenses (${formatMoney(
          topAmount,
        )}). ${categoryAdvice(topCat)}`,
      });
    }
  }

  // 5. Subscription / recurring tip
  if ((byCategory["subscriptions"] || 0) > 50) {
    out.push({
      id: "subs-audit",
      severity: "tip",
      title: "Audit your subscriptions",
      message: `📺 You're spending ${formatMoney(
        byCategory["subscriptions"] || 0,
      )} on subscriptions. Cancel anything you haven't used in the last 30 days — most people save $20–50/month doing this.`,
    });
  }

  // 6. Daily run-rate forecast
  if (daysElapsed >= 5 && daysInMonth > daysElapsed) {
    const dailyAvg = expenses / daysElapsed;
    const forecast = dailyAvg * daysInMonth;
    if (income > 0 && forecast > income * 1.05) {
      out.push({
        id: "forecast",
        severity: "warning",
        title: "On pace to overspend this month",
        message: `📊 At your current daily rate (${formatMoney(
          dailyAvg,
        )}/day), you're projected to spend ${formatMoney(
          forecast,
        )} this month — more than your income of ${formatMoney(
          income,
        )}. Cut back by ${formatMoney((forecast - income) / (daysInMonth - daysElapsed))}/day to break even.`,
      });
    }
  }

  // 7. No data yet
  if (out.length === 0) {
    out.push({
      id: "empty",
      severity: "info",
      title: "Looking good!",
      message:
        "No urgent issues detected. Keep tracking your spending consistently and set budgets for your top categories to get more tailored advice.",
    });
  }

  // Order by severity
  const order = { critical: 0, warning: 1, tip: 2, info: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function categoryAdvice(cat: string): string {
  switch (cat) {
    case "food":
      return "Try meal-prepping on Sundays — cooking at home can save $200+/month vs takeout.";
    case "groceries":
      return "Plan a weekly menu and shop with a list to avoid impulse buys. Generic brands save 20–30%.";
    case "transport":
      return "Carpool, combine errands, or try public transit one day a week to cut fuel costs.";
    case "housing":
      return "Housing should ideally be under 30% of income. If it's higher, consider a roommate or refinancing.";
    case "utilities":
      return "Lowering your thermostat 2°F and unplugging unused electronics can shave 10% off bills.";
    case "entertainment":
      return "Look for free local events, library passes, or rotate streaming services month-to-month.";
    case "shopping":
      return "Use a 48-hour rule: wait two days before any non-essential purchase to curb impulse buys.";
    case "subscriptions":
      return "Cancel anything you haven't used in 30 days.";
    case "travel":
      return "Book flights 6–8 weeks ahead and use price-tracking tools to save 20–40%.";
    default:
      return "Review the line items and see what's essential vs nice-to-have.";
  }
}
