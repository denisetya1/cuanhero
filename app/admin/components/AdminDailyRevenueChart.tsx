"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyRevenueChartItem = {
  date: string;
  label: string;
  IDR: number;
  USD: number;
  MYR: number;
  SGD: number;
};

const currencyLines = [
  { key: "IDR", color: "#2563eb" },
  { key: "USD", color: "#16a34a" },
  { key: "MYR", color: "#f97316" },
  { key: "SGD", color: "#9333ea" },
] as const;

const compactNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

export default function AdminDailyRevenueChart({
  data,
}: {
  data: DailyRevenueChartItem[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">
            Revenue
          </p>
          <h2 className="text-base font-bold text-slate-950">
            Daily approved revenue
          </h2>
        </div>
        <p className="text-xs text-slate-500">Last 30 days</p>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => compactNumber(Number(value))}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.date || "Date"
              }
              formatter={(value, name) => [
                compactNumber(Number(value)),
                String(name),
              ]}
            />
            {currencyLines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
