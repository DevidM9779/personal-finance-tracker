import { useState } from "react";
import { Card, CardBody, CardHeader } from "../components/ui";
import CategoryComparisonChart from "../components/CategoryComparisonChart";
import CashFlowSankey from "../components/CashFlowSankey";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, getTodayEST } from "../lib/format";
import { EXPENSE_CATEGORIES } from "../lib/categories";

export default function Analytics({ user, profile, accounts, transactions }) {
  const [comparisonMode, setComparisonMode] = useState("mom"); // "mom" or "yoy"
  const [selectedCashFlowMonth, setSelectedCashFlowMonth] = useState(new Date().toISOString());

  // Month navigation helpers
  const targetDate = selectedCashFlowMonth ? new Date(selectedCashFlowMonth) : new Date();
  const monthName = targetDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const goToPreviousMonth = () => {
    const newDate = new Date(targetDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedCashFlowMonth(newDate.toISOString());
  };

  const goToNextMonth = () => {
    const newDate = new Date(targetDate);
    newDate.setMonth(newDate.getMonth() + 1);
    const now = new Date();
    if (newDate <= now) {
      setSelectedCashFlowMonth(newDate.toISOString());
    }
  };

  const canGoNext = () => {
    const nextMonth = new Date(targetDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth <= new Date();
  };

  const getStartOfWeek = (dateString) => {
    const d = new Date(`${dateString}T00:00:00`); // Anchor to local midnight
    const day = d.getDay() || 7; 
    d.setDate(d.getDate() - (day - 1)); // Safe date math
    return d.toLocaleDateString("en-CA"); // Strictly returns "YYYY-MM-DD"
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getStartOfWeek(getTodayEST()));

  const goToPreviousWeek = () => {
    const d = new Date(`${selectedWeekStart}T00:00:00`);
    d.setDate(d.getDate() - 7);
    setSelectedWeekStart(d.toLocaleDateString("en-CA"));
  };

  const goToNextWeek = () => {
    const d = new Date(`${selectedWeekStart}T00:00:00`);
    d.setDate(d.getDate() + 7);
    setSelectedWeekStart(d.toLocaleDateString("en-CA"));
  };

  const canGoNextWeek = () => {
    const nextWeek = new Date(`${selectedWeekStart}T00:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const currentWeekStart = new Date(`${getStartOfWeek(getTodayEST())}T00:00:00`);
    return nextWeek <= currentWeekStart;
  };

  const selectedWeekEnd = new Date(`${selectedWeekStart}T00:00:00`);
  selectedWeekEnd.setDate(selectedWeekEnd.getDate() + 6);
  const selectedWeekEndStr = selectedWeekEnd.toLocaleDateString("en-CA");

  const weekLabel = `${new Date(`${selectedWeekStart}T00:00:00`).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${selectedWeekEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`;

  const thisWeeksExpenses = transactions.filter(
    (t) => t.type === "expense" && t.date >= selectedWeekStart && t.date <= selectedWeekEndStr
  );

  

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Analytics
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Financial Analytics
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Advanced insights into your spending patterns and financial trends
        </p>
      </header>

      {/* Cash Flow Analysis */}
      <Card>
        <CardHeader
          title="Cash Flow Analysis"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="rounded-md bg-neutral-900 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-neutral-200 min-w-[150px] text-center">
                {monthName}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={!canGoNext()}
                className="rounded-md bg-neutral-900 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          }
        />
        <CardBody>
          <CashFlowSankey
            transactions={transactions}
            accounts={accounts}
            selectedMonth={selectedCashFlowMonth}
          />
        </CardBody>
      </Card>

      {/* Spending Leak Analytics */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Quick Stats" />
          <CardBody>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Total Income (This Month)</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  {transactions
                    .filter(t => {
                      if (t.type !== "income") return false;
                      const txDate = new Date(t.date);
                      const targetDate = selectedCashFlowMonth ? new Date(selectedCashFlowMonth) : new Date();
                      return txDate.getMonth() === targetDate.getMonth() && txDate.getFullYear() === targetDate.getFullYear();
                    })
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Total Expenses (This Month)</p>
                <p className="mt-1 text-2xl font-semibold text-rose-400">
                  {transactions
                    .filter(t => {
                      if (t.type !== "expense") return false;
                      const txDate = new Date(t.date);
                      const targetDate = selectedCashFlowMonth ? new Date(selectedCashFlowMonth) : new Date();
                      return txDate.getMonth() === targetDate.getMonth() && txDate.getFullYear() === targetDate.getFullYear();
                    })
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Weekly Budgeting Visualizer */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader 
            title="Weekly Budget Tracker" 
            action={
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="rounded-md bg-neutral-900 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                  title="Previous week"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-neutral-200 min-w-[120px] text-center">
                  {weekLabel}
                </span>
                <button
                  onClick={goToNextWeek}
                  disabled={!canGoNextWeek()}
                  className="rounded-md bg-neutral-900 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-neutral-900 disabled:hover:text-neutral-400"
                  title="Next week"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXPENSE_CATEGORIES.map((cat) => {
                const budget = Number(profile?.weeklyBudgets?.[cat.id]) || 0;
                
                const spent = thisWeeksExpenses
                  .filter((t) => t.category === cat.id)
                  .reduce((sum, t) => sum + Number(t.amount), 0);
                
                // ONLY hide this block if no budget is set AND no money was spent. 
                if (budget === 0 && spent === 0) return null; 

                const remaining = budget - spent;
                const isOver = budget > 0 && remaining < 0;
                const noBudgetSet = budget === 0;
                // Prevent division by zero if budget isn't set yet
                const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 100;

                return (
                  <div key={cat.id} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-neutral-200">{cat.label}</span>
                      <span className={`text-xs font-bold ${noBudgetSet ? 'text-neutral-400' : (isOver ? 'text-rose-400' : 'text-emerald-400')}`}>
                        {noBudgetSet ? 'No limit set' : (isOver ? 'Over budget' : `${formatCurrency(remaining)} left`)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full ${noBudgetSet ? 'bg-neutral-600' : (isOver ? 'bg-rose-500' : 'bg-emerald-500')}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-500">
                      <span>{formatCurrency(spent)} spent</span>
                      <span>{noBudgetSet ? '—' : `${formatCurrency(budget)} limit`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Category Comparison */}
      <Card>
        <CardHeader title="Category Comparison Analysis" />
        <CardBody>
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setComparisonMode("mom")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  comparisonMode === "mom"
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                Month-over-Month
              </button>
              <button
                onClick={() => setComparisonMode("yoy")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  comparisonMode === "yoy"
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                Year-over-Year
              </button>
            </div>
          </div>
          <CategoryComparisonChart
            transactions={transactions}
            mode={comparisonMode}
          />
        </CardBody>
      </Card>
    </div>
  );
}