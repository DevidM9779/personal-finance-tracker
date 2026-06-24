import { useMemo } from "react";
import { TrendingUp, Minus } from "lucide-react";
import { categoryLabel } from "../lib/categories";
import { formatCurrency } from "../lib/format";

export default function TopMomIncreases({ transactions }) {
  const topIncreases = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Previous month (handle year rollover)
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    // Calculate spending by category for current month
    const currentMonthSpending = {};
    transactions
      .filter(t => {
        if (t.type !== "expense") return false;
        const txDate = new Date(t.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      })
      .forEach(t => {
        const category = t.category || "misc";
        currentMonthSpending[category] = (currentMonthSpending[category] || 0) + Number(t.amount || 0);
      });

    // Calculate spending by category for previous month
    const prevMonthSpending = {};
    transactions
      .filter(t => {
        if (t.type !== "expense") return false;
        const txDate = new Date(t.date);
        return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
      })
      .forEach(t => {
        const category = t.category || "misc";
        prevMonthSpending[category] = (prevMonthSpending[category] || 0) + Number(t.amount || 0);
      });

    // Calculate percentage increases
    const increases = [];
    Object.keys(currentMonthSpending).forEach(category => {
      const currentAmount = currentMonthSpending[category];
      const prevAmount = prevMonthSpending[category] || 0;

      if (prevAmount > 0) {
        const percentChange = ((currentAmount - prevAmount) / prevAmount) * 100;
        const absoluteChange = currentAmount - prevAmount;
        
        if (percentChange > 0) {
          increases.push({
            category,
            currentAmount,
            prevAmount,
            percentChange,
            absoluteChange,
          });
        }
      } else if (currentAmount > 0) {
        // New category this month
        increases.push({
          category,
          currentAmount,
          prevAmount: 0,
          percentChange: 100, // Treat as 100% increase from zero
          absoluteChange: currentAmount,
        });
      }
    });

    // Sort by percentage change and return top 5
    return increases
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 5);
  }, [transactions]);

  if (topIncreases.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-neutral-500 text-xs">
        No significant increases detected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topIncreases.map((item, index) => (
        <div key={item.category} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-neutral-400">
              {index + 1}
            </div>
            <div>
              <p className="text-neutral-200">{categoryLabel(item.category)}</p>
              <p className="text-[10px] text-neutral-500">
                {formatCurrency(item.prevAmount)} → {formatCurrency(item.currentAmount)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-rose-400">
              <TrendingUp size={12} />
              <span className="font-medium">+{item.percentChange.toFixed(0)}%</span>
            </div>
            <p className="text-[10px] text-neutral-500">
              {item.absoluteChange >= 0 ? "+" : ""}{formatCurrency(item.absoluteChange)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}