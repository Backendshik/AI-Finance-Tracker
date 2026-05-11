import {
  pgTable,
  serial,
  varchar,
  numeric,
  text,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 16 }).notNull(), // 'income' | 'expense'
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    description: text("description").notNull().default(""),
    occurredOn: date("occurred_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    occurredIdx: index("transactions_occurred_idx").on(table.occurredOn),
    typeIdx: index("transactions_type_idx").on(table.type),
  }),
);

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    category: varchar("category", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    monthCategoryUnique: uniqueIndex("budgets_month_category_unique").on(
      table.month,
      table.category,
    ),
  }),
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
