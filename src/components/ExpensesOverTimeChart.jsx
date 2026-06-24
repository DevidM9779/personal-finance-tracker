import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "../lib/format";
import {
  groupTransactionsByWeek,
  groupTransactionsByMonth,
} from "../lib/timeSeriesAggregation";

export default function ExpensesOverTimeChart({ transactions }) {
  const [viewMode, setViewMode] = useState("month"); // "week" or "month"

  const chartData = useMemo(() => {
    if (viewMode === "week") {
      return groupTransactionsByWeek(transactions, 12);
    } else {
      return groupTransactionsByMonth(transactions, 12).map(month => ({
        label: month.monthName,
        expenses: month.expenses,
        income: month.income,
        net: month.net,
      }));
    }
  }, [transactions, viewMode]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        No transaction data available yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("week")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "week"
                ? "bg-emerald-500 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "month"
                ? "bg-emerald-500 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {viewMode === "week" ? (
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="label"
              stroke="#737373"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#737373"
              fontSize={11}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 8,
                color: "#e5e5e5",
                fontSize: 12,
              }}
              formatter={(value, name) => {
                if (name === "expenses") return [formatCurrency(value), "Expenses"];
                if (name === "income") return [formatCurrency(value), "Income"];
                if (name === "net") return [formatCurrency(value), "Net"];
                return [value, name];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ fill: "#f87171", r: 3 }}
              name="Expenses"
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: "#34d399", r: 3 }}
              name="Income"
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="label"
              stroke="#737373"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#737373"
              fontSize={11}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 8,
                color: "#e5e5e5",
                fontSize: 12,
              }}
              formatter={(value, name) => {
                if (name === "expenses") return [formatCurrency(value), "Expenses"];
                if (name === "income") return [formatCurrency(value), "Income"];
                if (name === "net") return [formatCurrency(value), "Net"];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="expenses" fill="#f87171" name="Expenses" radius={[4, 4, 0, 0]} />
            <Bar dataKey="income" fill="#34d399" name="Income" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}