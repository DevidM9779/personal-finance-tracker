import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Badge, Stat } from "./ui";
import { formatCurrency } from "../lib/format";

export default function ImpulseTrackerCard({ transactions, profile }) {
  const impulseData = useMemo(() => {
    const impulseCategories = profile?.impulseCategories || ["misc", "restaurants_dates"];
    const threshold = Number(profile?.impulseThreshold) || 200;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate current month impulse spending
    const currentMonthSpending = transactions
      .filter(t => {
        if (t.type !== "expense") return false;
        if (!impulseCategories.includes(t.category)) return false;
        
        const txDate = new Date(t.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate percentage of threshold
    const percentage = Math.min((currentMonthSpending / threshold) * 100, 100);

    // Determine status
    let status = "good";
    if (percentage >= 80) status = "danger";
    else if (percentage >= 50) status = "warning";

    // Early warning check (if we're in first half of month and already over 50%)
    const dayOfMonth = now.getDate();
    const isEarlyMonth = dayOfMonth <= 15;
    const earlyWarning = isEarlyMonth && percentage >= 50;

    return {
      currentMonthSpending,
      threshold,
      percentage,
      status,
      earlyWarning,
    };
  }, [transactions, profile]);

  const getStatusColor = (status) => {
    switch (status) {
      case "danger": return "text-rose-400";
      case "warning": return "text-amber-400";
      default: return "text-emerald-400";
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case "danger": return "negative";
      case "warning": return "warning";
      default: return "positive";
    }
  };

  return (
    <div className="space-y-4">
      {impulseData.earlyWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-200">
          <TrendingUp size={16} className="mt-0.5 shrink-0" />
          <p className="text-xs">
            <span className="font-medium">Early warning:</span> You've already spent{" "}
            {impulseData.percentage.toFixed(0)}% of your impulse budget in the first half of the month.
          </p>
        </div>
      )}

      <Stat
        label="This month"
        value={formatCurrency(impulseData.currentMonthSpending)}
        tone={getStatusTone(impulseData.status)}
        hint={`${impulseData.percentage.toFixed(0)}% of ${formatCurrency(impulseData.threshold)} limit`}
      />

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Progress</span>
          <span className={getStatusColor(impulseData.status)}>
            {impulseData.percentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-900">
          <div
            className={`h-2 rounded-full transition-all ${
              impulseData.status === "danger"
                ? "bg-rose-500"
                : impulseData.status === "warning"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${impulseData.percentage}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        Limit: {formatCurrency(impulseData.threshold)}/month
      </div>
    </div>
  );
}