import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../lib/format";

export default function NetWorthChart({ snapshots }) {
  const chartData = useMemo(() => {
    // 1. Sort the raw snapshots FIRST before mapping so we can use exact timestamps
    const sortedSnapshots = [...snapshots].sort((a, b) => {
      const getTime = (snap) => {
        // Handle native Firestore Timestamps
        if (snap.createdAt?.toDate) return snap.createdAt.toDate().getTime();
        // Handle standard ISO date strings if present
        if (snap.createdAt) return new Date(snap.createdAt).getTime();
        if (snap.date) return new Date(snap.date).getTime();
        // Fallback to month/year if no exact timestamp exists
        return new Date(snap.year, snap.month - 1).getTime();
      };

      // Sort ascending (oldest to newest for the chart)
      return getTime(a) - getTime(b);
    });

    // 2. Map the correctly sorted data into the simplified format Recharts expects
    return sortedSnapshots.map((snap) => ({
      date: `${snap.month}/${snap.year}`, // Keeps the clean label for the X-Axis
      netWorth: Number(snap.netWorth || 0),
      liquidCash: Number(snap.liquidCash || 0),
      assets: Number(snap.assets || 0),
      debt: Number(snap.creditDebt || 0),
    }));
  }, [snapshots]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        No net worth history available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="date"
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
            if (name === "netWorth") return [formatCurrency(value), "Net Worth"];
            if (name === "liquidCash") return [formatCurrency(value), "Liquid Cash"];
            if (name === "assets") return [formatCurrency(value), "Assets"];
            if (name === "debt") return [formatCurrency(value), "Debt"];
            return [value, name];
          }}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="#34d399"
          strokeWidth={2}
          dot={{ fill: "#34d399", r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="liquidCash"
          stroke="#60a5fa"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="assets"
          stroke="#fbbf24"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="debt"
          stroke="#f87171"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}