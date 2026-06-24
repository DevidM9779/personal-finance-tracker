import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { categoryLabel } from "../lib/categories";
import { formatCurrency } from "../lib/format";

export default function CategoryComparisonChart({ transactions, mode }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (mode === "mom") {
      // Month-over-Month comparison: current month vs previous month
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.getMonth();
      const prevYear = prevMonthDate.getFullYear();

      const currentMonthData = {};
      const prevMonthData = {};

      transactions.forEach(t => {
        if (t.type !== "expense") return;
        const category = t.category || "misc";
        const txDate = new Date(t.date);
        const amount = Number(t.amount || 0);

        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          currentMonthData[category] = (currentMonthData[category] || 0) + amount;
        } else if (txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear) {
          prevMonthData[category] = (prevMonthData[category] || 0) + amount;
        }
      });

      // Get all categories that have spending in either month
      const allCategories = [...new Set([...Object.keys(currentMonthData), ...Object.keys(prevMonthData)])];

      return allCategories.map(category => ({
        category: categoryLabel(category),
        current: currentMonthData[category] || 0,
        previous: prevMonthData[category] || 0,
      }));
    } else {
      // Year-over-Year comparison: current month vs same month last year
      const lastYearDate = new Date(now.getFullYear() - 1, currentMonth, 1);
      const lastYear = lastYearDate.getFullYear();

      const currentMonthData = {};
      const lastYearData = {};

      transactions.forEach(t => {
        if (t.type !== "expense") return;
        const category = t.category || "misc";
        const txDate = new Date(t.date);
        const amount = Number(t.amount || 0);

        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          currentMonthData[category] = (currentMonthData[category] || 0) + amount;
        } else if (txDate.getMonth() === currentMonth && txDate.getFullYear() === lastYear) {
          lastYearData[category] = (lastYearData[category] || 0) + amount;
        }
      });

      const allCategories = [...new Set([...Object.keys(currentMonthData), ...Object.keys(lastYearData)])];

      return allCategories.map(category => ({
        category: categoryLabel(category),
        current: currentMonthData[category] || 0,
        previous: lastYearData[category] || 0,
      }));
    }
  }, [transactions, mode]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        No comparison data available yet
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 16, right: 16, left: -16, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="category"
            stroke="#737373"
            fontSize={11}
            tick={{ fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis
            stroke="#737373"
            fontSize={11}
            tick={{ fill: "#a1a1aa" }}
            tickFormatter={(v) => formatCurrency(v, { compact: true })}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === "current") return [formatCurrency(value), mode === "mom" ? "This Month" : "This Year"];
              if (name === "previous") return [formatCurrency(value), mode === "mom" ? "Last Month" : "Last Year"];
              return [value, name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => <span style={{ color: "#e5e7eb" }}>{value}</span>}
          />
          <Bar dataKey="current" fill="#34d399" name={mode === "mom" ? "This Month" : "This Year"} radius={[4, 4, 0, 0]} />
          <Bar dataKey="previous" fill="#6b7280" name={mode === "mom" ? "Last Month" : "Last Year"} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}