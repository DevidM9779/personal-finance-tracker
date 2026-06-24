import { useState } from "react";
import { Card, CardBody, CardHeader } from "../components/ui";
import CategoryComparisonChart from "../components/CategoryComparisonChart";
import CashFlowSankey from "../components/CashFlowSankey";
import TopMomIncreases from "../components/TopMomIncreases";
import ImpulseTrackerCard from "../components/ImpulseTrackerCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
          <CardHeader title="Impulse Spending Tracker" />
          <CardBody>
            <ImpulseTrackerCard transactions={transactions} profile={profile} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top Spending Increases" />
          <CardBody>
            <TopMomIncreases transactions={transactions} />
          </CardBody>
        </Card>

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