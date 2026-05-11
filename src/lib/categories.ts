export const EXPENSE_CATEGORIES = [
  { key: "food", label: "Food & Dining", emoji: "🍔", color: "#f97316" },
  { key: "groceries", label: "Groceries", emoji: "🛒", color: "#10b981" },
  { key: "transport", label: "Transport", emoji: "🚗", color: "#3b82f6" },
  { key: "housing", label: "Housing & Rent", emoji: "🏠", color: "#8b5cf6" },
  { key: "utilities", label: "Utilities", emoji: "💡", color: "#eab308" },
  { key: "entertainment", label: "Entertainment", emoji: "🎬", color: "#ec4899" },
  { key: "shopping", label: "Shopping", emoji: "🛍️", color: "#f43f5e" },
  { key: "health", label: "Health", emoji: "💊", color: "#06b6d4" },
  { key: "education", label: "Education", emoji: "📚", color: "#6366f1" },
  { key: "subscriptions", label: "Subscriptions", emoji: "📺", color: "#a855f7" },
  { key: "travel", label: "Travel", emoji: "✈️", color: "#14b8a6" },
  { key: "other", label: "Other", emoji: "📦", color: "#64748b" },
] as const;

export const INCOME_CATEGORIES = [
  { key: "salary", label: "Salary", emoji: "💼", color: "#22c55e" },
  { key: "freelance", label: "Freelance", emoji: "💻", color: "#0ea5e9" },
  { key: "investment", label: "Investment", emoji: "📈", color: "#84cc16" },
  { key: "gift", label: "Gift", emoji: "🎁", color: "#f59e0b" },
  { key: "other_income", label: "Other Income", emoji: "💰", color: "#16a34a" },
] as const;

export type CategoryKey =
  | (typeof EXPENSE_CATEGORIES)[number]["key"]
  | (typeof INCOME_CATEGORIES)[number]["key"];

export function getCategory(key: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === key) ||
    INCOME_CATEGORIES.find((c) => c.key === key) || {
      key,
      label: key,
      emoji: "•",
      color: "#94a3b8",
    }
  );
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}
