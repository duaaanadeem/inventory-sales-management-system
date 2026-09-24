"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  salesData: {
    name: string;
    sales: number;
  }[];
}

export default function SalesChart({ salesData }: SalesChartProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          Daily Sales Overview
        </h2>

        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
          This Week
        </span>
      </div>

      <div className="h-64 sm:h-72 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />

            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />

            <Tooltip
              contentStyle={{
                fontSize: "13px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />

            <Line
              type="monotone"
              dataKey="sales"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={{ r: 4, fill: "#4f46e5" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}