"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type NewMembersChartItem = {
  date: string;
  label: string;
  members: number;
};

export default function AdminNewMembersChart({
  data,
  className = "mt-6",
}: {
  data: NewMembersChartItem[];
  className?: string;
}) {
  return (
    <div className={`${className} rounded-xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-slate-400">
            New Members
          </p>
          <h2 className="text-base font-bold text-slate-950">
            Daily new members
          </h2>
        </div>
        <p className="text-xs text-slate-500">Last 30 days</p>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.date || "Date"
              }
              formatter={(value) => [value, "New members"]}
            />
            <Bar
              dataKey="members"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
