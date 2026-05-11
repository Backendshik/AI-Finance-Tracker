# Finance Tracker AI

Finance Tracker AI is an AI-powered personal finance tracker web application built with Next.js, TypeScript, PostgreSQL, Drizzle ORM, and Tailwind CSS. The application helps users track income, expenses, budgets, categories, and spending reports. It also includes an AI-style suggestion system that analyzes spending behavior and gives useful financial advice.

## Features

- Add and manage income and expense transactions
- Track spending by category
- Create and manage monthly budgets
- View financial reports
- Analyze income, expenses, and savings
- AI-powered financial suggestions
- Dashboard with finance summary
- Charts for better data visualization
- PostgreSQL database support
- API routes for transactions, budgets, reports, and health check
- Built with modern Next.js App Router structure

## Technologies Used

- Next.js
- React
- TypeScript
- PostgreSQL
- Drizzle ORM
- Tailwind CSS
- ESLint

## Project Structure

```text
Finance-Tracker-AI/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── budgets/
│   │   │   ├── health/
│   │   │   ├── report/
│   │   │   └── transactions/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── Charts.tsx
│   │   └── Dashboard.tsx
│   │
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   │
│   └── lib/
│       ├── ai.ts
│       ├── categories.ts
│       └── report.ts
│
├── drizzle.config.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md


***Installation***
To run this project on your computer, follow these steps:

### 1. Clone the repository

```bash
git clone https://github.com/Backendskhik/Finance-Tracker-AI.git
2. Open the project folder
cd Finance-Tracker-AI
3. Install dependencies
npm install
4. Create environment file

Create a .env file in the main project folder and add your database connection:

DATABASE_URL=your_postgresql_database_url_here
5. Run the development server
npm run dev
6. Open the project in your browser
http://localhost:3000
