"use client";

import { getCategory, formatMoney } from "@/lib/categories";

type DonutSlice = { key: string; value: number };

export function DonutChart({
  data,
  size = 220,
  thickness = 32,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  if (total <= 0) {
    return (
      <div
        className="grid place-items-center text-slate-500 text-sm"
        style={{ width: size, height: size }}
      >
        No data yet
      </div>
    );
  }

  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={thickness}
        />
        {data.map((d) => {
          const meta = getCategory(d.key);
          const len = (d.value / total) * circ;
          const dash = `${len} ${circ - len}`;
          const el = (
            <circle
              key={d.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={meta.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total</div>
          <div className="text-xl font-semibold text-white">{formatMoney(total)}</div>
        </div>
      </div>
    </div>
  );
}

export function CategoryLegend({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;
  return (
    <ul className="space-y-2">
      {data.map((d) => {
        const meta = getCategory(d.key);
        const pct = ((d.value / total) * 100).toFixed(1);
        return (
          <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <span className="truncate">
                {meta.emoji} {meta.label}
              </span>
            </div>
            <div className="text-slate-300 font-medium tabular-nums">
              {formatMoney(d.value)}{" "}
              <span className="text-slate-500">({pct}%)</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyBarChart({
  data,
  height = 180,
}: {
  data: Array<{ day: number; income: number; expense: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const padX = 8;
  const padTop = 16;
  const padBottom = 24;
  const innerH = height - padTop - padBottom;
  const barGroupW = 100 / data.length; // percentage based

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={0}
            x2={100}
            y1={padTop + innerH * (1 - g)}
            y2={padTop + innerH * (1 - g)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.2}
          />
        ))}
        {data.map((d, i) => {
          const xCenter = i * barGroupW + barGroupW / 2;
          const bw = Math.max(0.6, barGroupW * 0.32);
          const incH = (d.income / max) * innerH;
          const expH = (d.expense / max) * innerH;
          return (
            <g key={d.day}>
              <rect
                x={xCenter - bw - 0.3}
                y={padTop + innerH - incH}
                width={bw}
                height={incH}
                fill="#22c55e"
                rx={0.3}
              />
              <rect
                x={xCenter + 0.3}
                y={padTop + innerH - expH}
                width={bw}
                height={expH}
                fill="#ef4444"
                rx={0.3}
              />
            </g>
          );
        })}
        {/* x-axis labels (every 5) */}
        {data
          .filter((d) => d.day % 5 === 0 || d.day === 1 || d.day === data.length)
          .map((d, _, arr) => {
            const i = data.findIndex((x) => x.day === d.day);
            const xCenter = i * barGroupW + barGroupW / 2;
            return (
              <text
                key={d.day}
                x={xCenter}
                y={height - 6}
                textAnchor="middle"
                fontSize={3}
                fill="rgba(255,255,255,0.4)"
              >
                {d.day}
              </text>
            );
          })}
      </svg>
      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-red-500" /> Expenses
        </span>
      </div>
    </div>
  );
}
