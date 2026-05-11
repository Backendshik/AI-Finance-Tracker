"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  currentMonth,
  formatMoney,
  getCategory,
  monthLabel,
} from "@/lib/categories";
import { DonutChart, CategoryLegend, DailyBarChart } from "./Charts";
import type { Suggestion } from "@/lib/ai";

type TxRow = {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string;
  occurredOn: string;
  createdAt: string;
};

type ReportData = {
  report: {
    month: string;
    income: number;
    expenses: number;
    net: number;
    byCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
    byDay: Array<{ day: number; income: number; expense: number }>;
    budgets: Record<string, number>;
    txCount: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  previousMonth: {
    month: string;
    income: number;
    expenses: number;
    net: number;
    byCategory: Record<string, number>;
  };
  suggestions: Suggestion[];
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [report, setReport] = useState<ReportData | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "transactions" | "budgets" | "ai">(
    "overview",
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        fetch(`/api/report?month=${month}`, { cache: "no-store" }).then((x) =>
          x.json(),
        ),
        fetch(`/api/transactions?month=${month}`, { cache: "no-store" }).then((x) =>
          x.json(),
        ),
      ]);
      setReport(r);
      setTransactions(t.transactions || []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const expenseSlices = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.report.byCategory)
      .map(([k, v]) => ({ key: k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [report]);

  const criticalAlerts = useMemo(() => {
    if (!report) return [];
    return report.suggestions.filter(
      (s) => s.severity === "critical" || s.severity === "warning",
    );
  }, [report]);

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 grid place-items-center text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/20">
              ₣
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                FinPilot
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                AI-powered personal finance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="h-9 w-9 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/5"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="px-3 h-9 grid place-items-center rounded-lg bg-white/5 border border-white/5 text-sm font-medium min-w-[140px] text-center">
              {monthLabel(month)}
            </div>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="h-9 w-9 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/5"
              aria-label="Next month"
            >
              ›
            </button>
            <button
              onClick={() => setMonth(currentMonth())}
              className="ml-1 h-9 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/20 transition"
            >
              Today
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {(
            [
              ["overview", "📊 Overview"],
              ["transactions", "💳 Transactions"],
              ["budgets", "🎯 Budgets"],
              ["ai", "✨ AI Insights"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === k
                  ? "border-emerald-400 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Alerts banner */}
        {criticalAlerts.length > 0 && (
          <AlertsBanner
            alerts={criticalAlerts}
            onView={() => setTab("ai")}
          />
        )}

        {tab === "overview" && (
          <Overview
            report={report}
            loading={loading}
            transactions={transactions}
            expenseSlices={expenseSlices}
            onAdded={loadAll}
            month={month}
          />
        )}

        {tab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            onChanged={loadAll}
            month={month}
          />
        )}

        {tab === "budgets" && (
          <BudgetsTab
            month={month}
            report={report}
            onChanged={loadAll}
          />
        )}

        {tab === "ai" && <AITab report={report} loading={loading} />}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-slate-500">
        FinPilot · Track smarter, save more
      </footer>
    </div>
  );
}

function AlertsBanner({
  alerts,
  onView,
}: {
  alerts: Suggestion[];
  onView: () => void;
}) {
  const top = alerts[0];
  const tone =
    top.severity === "critical"
      ? "from-red-500/20 to-orange-500/10 border-red-500/30 text-red-100"
      : "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-100";
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-r ${tone} p-4 flex items-start gap-4`}
    >
      <div className="text-2xl shrink-0">
        {top.severity === "critical" ? "🚨" : "⚠️"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white">{top.title}</div>
        <div className="text-sm opacity-90 mt-0.5">{top.message}</div>
        {alerts.length > 1 && (
          <div className="text-xs opacity-75 mt-1">
            +{alerts.length - 1} more {alerts.length - 1 === 1 ? "alert" : "alerts"}
          </div>
        )}
      </div>
      <button
        onClick={onView}
        className="shrink-0 self-center text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/10"
      >
        View all →
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "positive" | "negative";
  hint?: string;
}) {
  const valueColor =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
      ? "text-red-400"
      : "text-white";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {delta && (
        <div className="text-xs text-slate-400 mt-1 tabular-nums">{delta}</div>
      )}
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Overview({
  report,
  loading,
  transactions,
  expenseSlices,
  onAdded,
  month,
}: {
  report: ReportData | null;
  loading: boolean;
  transactions: TxRow[];
  expenseSlices: { key: string; value: number }[];
  onAdded: () => void;
  month: string;
}) {
  const r = report?.report;
  const prev = report?.previousMonth;

  const savingsRate =
    r && r.income > 0 ? ((r.income - r.expenses) / r.income) * 100 : 0;

  const expenseDelta =
    prev && prev.expenses > 0 && r
      ? ((r.expenses - prev.expenses) / prev.expenses) * 100
      : null;

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Income"
          value={formatMoney(r?.income ?? 0)}
          tone="positive"
          hint={prev ? `vs ${formatMoney(prev.income)} last month` : undefined}
        />
        <StatCard
          label="Expenses"
          value={formatMoney(r?.expenses ?? 0)}
          tone="negative"
          delta={
            expenseDelta != null
              ? `${expenseDelta >= 0 ? "▲" : "▼"} ${Math.abs(expenseDelta).toFixed(1)}% vs last month`
              : undefined
          }
        />
        <StatCard
          label="Net Savings"
          value={formatMoney(r?.net ?? 0)}
          tone={r && r.net >= 0 ? "positive" : "negative"}
          hint={r ? `${savingsRate.toFixed(1)}% savings rate` : undefined}
        />
        <StatCard
          label="Transactions"
          value={String(r?.txCount ?? 0)}
          hint={
            r
              ? `Day ${r.daysElapsed} of ${r.daysInMonth}`
              : undefined
          }
        />
      </div>

      {/* Add transaction + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AddTransactionCard month={month} onAdded={onAdded} />
        </div>

        <Card className="lg:col-span-2" title="Spending by Category">
          {loading ? (
            <SkeletonChart />
          ) : expenseSlices.length === 0 ? (
            <EmptyState
              emoji="💸"
              text="No expenses yet this month. Add one to see the breakdown."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div className="grid place-items-center">
                <DonutChart data={expenseSlices} />
              </div>
              <CategoryLegend data={expenseSlices} />
            </div>
          )}
        </Card>
      </div>

      {/* Daily chart + Budget progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" title="Daily Cash Flow">
          {loading ? (
            <SkeletonChart />
          ) : (
            <DailyBarChart data={r?.byDay ?? []} />
          )}
        </Card>

        <Card title="Budget Progress">
          <BudgetProgressList report={report} />
        </Card>
      </div>

      {/* Recent transactions */}
      <Card title="Recent Transactions">
        <RecentTransactionsList transactions={transactions.slice(0, 8)} />
      </Card>
    </>
  );
}

function Card({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/5 bg-white/[0.03] p-5 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function SkeletonChart() {
  return (
    <div className="h-48 rounded-xl bg-white/5 animate-pulse grid place-items-center text-slate-500 text-sm">
      Loading…
    </div>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-10 text-center text-slate-400 text-sm">
      <div className="text-4xl mb-2">{emoji}</div>
      {text}
    </div>
  );
}

function AddTransactionCard({
  month,
  onAdded,
}: {
  month: string;
  onAdded: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].key);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // when month changes default date to first day of that month if not in current month
  useEffect(() => {
    const cur = new Date().toISOString().slice(0, 7);
    if (month !== cur) {
      setDate(`${month}-15`);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [month]);

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  useEffect(() => {
    setCategory(cats[0].key);
  }, [type, cats]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          category,
          description,
          occurredOn: date,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to add");
      }
      setAmount("");
      setDescription("");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Add Transaction">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              type === "expense"
                ? "bg-red-500/20 text-red-200 ring-1 ring-red-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            − Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              type === "income"
                ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            + Income
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {cats.map((c) => (
              <option key={c.key} value={c.key} className="bg-slate-900">
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Lunch with team"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {submitting ? "Adding…" : "Add Transaction"}
        </button>
      </form>
    </Card>
  );
}

function BudgetProgressList({ report }: { report: ReportData | null }) {
  if (!report) return <SkeletonChart />;
  const r = report.report;
  const entries = Object.entries(r.budgets);
  if (entries.length === 0) {
    return (
      <EmptyState
        emoji="🎯"
        text="No budgets set. Go to the Budgets tab to set monthly limits per category."
      />
    );
  }
  entries.sort((a, b) => b[1] - a[1]);
  return (
    <ul className="space-y-3">
      {entries.map(([cat, budget]) => {
        const spent = r.byCategory[cat] || 0;
        const pct = Math.min(100, (spent / budget) * 100);
        const over = spent > budget;
        const meta = getCategory(cat);
        const barColor = over
          ? "bg-red-500"
          : pct >= 80
          ? "bg-amber-500"
          : "bg-emerald-500";
        return (
          <li key={cat}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">
                {meta.emoji} {meta.label}
              </span>
              <span
                className={`tabular-nums text-xs ${
                  over ? "text-red-400" : "text-slate-400"
                }`}
              >
                {formatMoney(spent)} / {formatMoney(budget)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentTransactionsList({
  transactions,
  onDelete,
}: {
  transactions: TxRow[];
  onDelete?: (id: number) => void;
}) {
  if (transactions.length === 0) {
    return <EmptyState emoji="📭" text="No transactions yet for this month." />;
  }
  return (
    <ul className="divide-y divide-white/5">
      {transactions.map((t) => {
        const meta = getCategory(t.category);
        const amt = Number(t.amount);
        return (
          <li
            key={t.id}
            className="py-3 flex items-center gap-3 group"
          >
            <div
              className="h-10 w-10 rounded-xl grid place-items-center text-lg shrink-0"
              style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
            >
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {t.description || meta.label}
              </div>
              <div className="text-xs text-slate-400">
                {meta.label} · {new Date(t.occurredOn).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <div
              className={`tabular-nums font-semibold ${
                t.type === "income" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {t.type === "income" ? "+" : "−"}
              {formatMoney(amt)}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 transition text-xs text-slate-500 hover:text-red-400 ml-2"
                aria-label="Delete"
              >
                ✕
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TransactionsTab({
  transactions,
  onChanged,
  month,
}: {
  transactions: TxRow[];
  onChanged: () => void;
  month: string;
}) {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = transactions.filter((t) =>
    filter === "all" ? true : t.type === filter,
  );

  async function handleDelete(id: number) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AddTransactionCard month={month} onAdded={onChanged} />
        </div>
        <Card
          className="lg:col-span-2"
          title={`All Transactions (${filtered.length})`}
          action={
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              {(["all", "income", "expense"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    filter === f
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
                </button>
              ))}
            </div>
          }
        >
          <RecentTransactionsList
            transactions={filtered}
            onDelete={handleDelete}
          />
        </Card>
      </div>
    </>
  );
}

function BudgetsTab({
  month,
  report,
  onChanged,
}: {
  month: string;
  report: ReportData | null;
  onChanged: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(report.report.budgets)) {
        next[k] = String(v);
      }
      setDrafts(next);
    }
  }, [report]);

  async function save(category: string) {
    setSaving(category);
    try {
      const raw = drafts[category];
      const amount = raw === "" || raw === undefined ? 0 : Number(raw);
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, month }),
      });
      onChanged();
    } finally {
      setSaving(null);
    }
  }

  const r = report?.report;

  return (
    <Card title={`Monthly Budgets · ${monthLabel(month)}`}>
      <p className="text-sm text-slate-400 mb-4">
        Set a spending limit for each category. Set to 0 to remove. We&apos;ll
        warn you when you&apos;re close to or over the limit.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXPENSE_CATEGORIES.map((c) => {
          const spent = r?.byCategory[c.key] || 0;
          const budgetVal = Number(drafts[c.key] || 0);
          const pct = budgetVal > 0 ? Math.min(100, (spent / budgetVal) * 100) : 0;
          const over = budgetVal > 0 && spent > budgetVal;
          return (
            <div
              key={c.key}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white text-sm">
                  {c.emoji} {c.label}
                </span>
                {budgetVal > 0 && (
                  <span
                    className={`text-xs tabular-nums ${
                      over ? "text-red-400" : "text-slate-400"
                    }`}
                  >
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mb-2 tabular-nums">
                Spent: {formatMoney(spent)}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={drafts[c.key] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [c.key]: e.target.value }))
                    }
                    className="w-full pl-6 pr-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm tabular-nums"
                  />
                </div>
                <button
                  onClick={() => save(c.key)}
                  disabled={saving === c.key}
                  className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-sm rounded-lg transition disabled:opacity-50 border border-emerald-500/20"
                >
                  {saving === c.key ? "…" : "Save"}
                </button>
              </div>
              {budgetVal > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      over
                        ? "bg-red-500"
                        : pct >= 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AITab({
  report,
  loading,
}: {
  report: ReportData | null;
  loading: boolean;
}) {
  if (loading || !report) return <SkeletonChart />;
  const { suggestions, report: r, previousMonth } = report;

  return (
    <div className="space-y-4">
      <Card title="AI-Powered Insights">
        <p className="text-sm text-slate-400 mb-4">
          Personalized suggestions based on your spending patterns, budgets, and
          month-over-month trends.
        </p>
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <SuggestionItem key={s.id} suggestion={s} />
          ))}
        </ul>
      </Card>

      <Card title={`Monthly Report · ${monthLabel(r.month)}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <ReportStat
            label="Total Income"
            value={formatMoney(r.income)}
            prev={formatMoney(previousMonth.income)}
          />
          <ReportStat
            label="Total Expenses"
            value={formatMoney(r.expenses)}
            prev={formatMoney(previousMonth.expenses)}
          />
          <ReportStat
            label="Net"
            value={formatMoney(r.net)}
            prev={formatMoney(previousMonth.net)}
            tone={r.net >= 0 ? "positive" : "negative"}
          />
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            Category breakdown
          </h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">This month</th>
                <th className="text-right py-2">Last month</th>
                <th className="text-right py-2">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(r.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => {
                  const prev = previousMonth.byCategory[cat] || 0;
                  const delta = amt - prev;
                  const pct = prev > 0 ? (delta / prev) * 100 : null;
                  const meta = getCategory(cat);
                  return (
                    <tr key={cat}>
                      <td className="py-2">
                        {meta.emoji} {meta.label}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMoney(amt)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-400">
                        {formatMoney(prev)}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          delta > 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {delta === 0
                          ? "—"
                          : `${delta > 0 ? "+" : ""}${formatMoney(delta)}${
                              pct != null ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)` : ""
                            }`}
                      </td>
                    </tr>
                  );
                })}
              {Object.keys(r.byCategory).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No expense data this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportStat({
  label,
  value,
  prev,
  tone,
}: {
  label: string;
  value: string;
  prev: string;
  tone?: "positive" | "negative";
}) {
  const color =
    tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-semibold tabular-nums mt-1 ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1 tabular-nums">
        Previous: {prev}
      </div>
    </div>
  );
}

function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  const map = {
    critical: {
      icon: "🚨",
      ring: "ring-red-500/30",
      bg: "bg-red-500/10",
      tag: "bg-red-500/20 text-red-200",
      label: "Critical",
    },
    warning: {
      icon: "⚠️",
      ring: "ring-amber-500/30",
      bg: "bg-amber-500/10",
      tag: "bg-amber-500/20 text-amber-200",
      label: "Warning",
    },
    tip: {
      icon: "💡",
      ring: "ring-cyan-500/30",
      bg: "bg-cyan-500/10",
      tag: "bg-cyan-500/20 text-cyan-200",
      label: "Tip",
    },
    info: {
      icon: "ℹ️",
      ring: "ring-emerald-500/30",
      bg: "bg-emerald-500/10",
      tag: "bg-emerald-500/20 text-emerald-200",
      label: "Info",
    },
  } as const;
  const s = map[suggestion.severity];
  return (
    <li
      className={`rounded-xl ${s.bg} ring-1 ${s.ring} p-4 flex items-start gap-3`}
    >
      <div className="text-2xl shrink-0">{s.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${s.tag}`}>
            {s.label}
          </span>
          <h4 className="font-semibold text-white">{suggestion.title}</h4>
        </div>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
          {suggestion.message}
        </p>
      </div>
    </li>
  );
}
