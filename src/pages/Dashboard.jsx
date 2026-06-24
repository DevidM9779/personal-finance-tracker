import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNetWorthHistory } from "../hooks/useNetWorthHistory";
import NetWorthChart from "../components/NetWorthChart";
import ExpensesOverTimeChart from "../components/ExpensesOverTimeChart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CreditCard,
  PiggyBank,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Empty, Stat } from "../components/ui";
import { categoryLabel } from "../lib/categories";
import { formatCurrency, formatDate, ordinal } from "../lib/format";
import {
  buildForecast,
  expensesByCategoryThisMonth,
} from "../lib/forecast";
import { upsertNetWorthSnapshot } from "../lib/netWorthSnapshots";
import { useToast } from "../components/toastHooks";

export default function Dashboard({ profile, accounts, transactions, recurring, user }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { snapshots: netWorthSnapshots } = useNetWorthHistory(user?.uid, accounts);
  const { toast } = useToast();
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  const handleCreateSnapshot = async () => {
    if (!user || creatingSnapshot) return;
    setCreatingSnapshot(true);
    try {
      await upsertNetWorthSnapshot(user.uid, accounts);
      toast({
        title: "Snapshot created",
        variant: "success",
      });
    } catch (err) {
      console.error("Failed to create snapshot:", err);
      toast({
        title: "Failed to create snapshot",
        description: err?.message || "Unknown error",
        variant: "error",
      });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const forecast = useMemo(
    () => buildForecast({ accounts, recurring, profile }),
    [accounts, recurring, profile]
  );

  const categoryData = useMemo(
    () =>
      expensesByCategoryThisMonth(transactions).map((row) => ({
        category: row.category,
        label: categoryLabel(row.category),
        amount: Number(row.amount.toFixed(2)),
      })),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!selectedCategory) return filtered;
    return filtered.filter(t => t.category === selectedCategory);
  }, [transactions, selectedCategory]);

  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  const bankAccounts = accounts.filter((a) => a.type === "bank");
  const creditCards = accounts.filter((a) => a.type === "creditCard");
  const assetAccounts = accounts.filter((a) => a.type === "asset");
  const incomeExpected = Number(profile?.expectedMonthlyIncome || 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            Overview · {monthName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Net worth snapshot, debt anticipation, and category spend at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/entry">
            <Button>
              Log this week
              <ArrowUpRight size={14} />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody>
            <Stat
              label="Net Worth"
              value={formatCurrency(forecast.netWorth)}
              tone={forecast.netWorth >= 0 ? "positive" : "negative"}
              hint={`Liquid + Assets − Credit debt`}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Liquid Cash"
              value={formatCurrency(forecast.liquidCash)}
              hint={`${bankAccounts.length} bank account${bankAccounts.length === 1 ? "" : "s"}`}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Assets"
              value={formatCurrency(forecast.assets)}
              hint={`${assetAccounts.length} asset${assetAccounts.length === 1 ? "" : "s"}`}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Credit Debt"
              value={formatCurrency(forecast.creditDebt)}
              tone={forecast.creditDebt > 0 ? "negative" : "neutral"}
              hint={`${creditCards.length} card${creditCards.length === 1 ? "" : "s"}`}
            />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Net Worth History"
            subtitle="Track your financial progress over time"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateSnapshot}
                disabled={creatingSnapshot}
                className="h-8"
              >
                {creatingSnapshot ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={14} className="mr-1" />
                    Create Snapshot
                  </>
                )}
              </Button>
            }
          />
          <CardBody>
            <NetWorthChart snapshots={netWorthSnapshots} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Expenses Over Time"
            subtitle="Analyze your spending patterns"
          />
          <CardBody>
            <ExpensesOverTimeChart transactions={transactions} />
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Debt Anticipation Engine"
            subtitle={
              forecast.nextDebtPaymentDate
                ? `On ${formatDate(forecast.nextDebtPaymentDate)} you plan to pay all open statement balances.`
                : "Set a preferred debt payment day in your profile to enable forecasting."
            }
          />
          <CardBody>
            {forecast.nextDebtPaymentDate ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Stat
                    label="Statement Balances"
                    value={formatCurrency(forecast.anticipatedDebt)}
                    tone="negative"
                    hint="Sum across active cards"
                  />
                  <Stat
                    label="Bills Until Then"
                    value={formatCurrency(forecast.upcomingRecurring)}
                    tone="negative"
                    hint="Recurring bills and expenses"
                  />
                  <Stat
                    label="Cash Needed"
                    value={formatCurrency(forecast.totalCashNeeded)}
                    tone={forecast.needsEmergencyWithdrawal ? "negative" : "positive"}
                    hint={`vs ${formatCurrency(forecast.liquidCash)} liquid`}
                  />
                </div>

                {forecast.needsEmergencyWithdrawal ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-200 sm:flex-row sm:items-start sm:gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">
                        Liquidity alert · short by {formatCurrency(forecast.cashShortfall)}
                      </p>
                      <p className="mt-1 text-xs text-rose-200/80">
                        Consider withdrawing from your Emergency Fund or another
                        asset account to cover statement balances and recurring
                        expenses on{" "}
                        {formatDate(forecast.nextDebtPaymentDate)}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-200">
                    <Wallet size={18} className="mt-0.5 shrink-0" />
                    <p className="text-sm">
                      You have enough liquid cash to cover statement balances
                      and recurring expenses through {formatDate(forecast.nextDebtPaymentDate)}.
                    </p>
                  </div>
                )}

                <CreditCardsTable creditCards={creditCards} />
              </div>
            ) : (
              <Empty
                icon={CalendarClock}
                title="No debt payment day set"
                hint="Visit Profile to choose the day of the month you pay all credit cards."
                action={
                  <Link to="/profile">
                    <Button variant="secondary" size="sm">
                      Configure profile
                    </Button>
                  </Link>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Monthly Income"
            subtitle="Expected vs logged"
          />
          <CardBody>
            <Stat
              label="Expected"
              value={formatCurrency(incomeExpected)}
              tone="positive"
            />
            <Stat
              className="mt-4"
              label="Logged this month"
              value={formatCurrency(loggedIncomeThisMonth(transactions))}
              hint="Sum of income transactions"
            />
            <div className="mt-5">
              <Link to="/entry">
                <Button variant="secondary" className="w-full" size="sm">
                  <Receipt size={14} /> Log income
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Expenses by category · ${monthName}`}
            subtitle="Aggregated from logged transactions"
          />
          <CardBody>
            {categoryData.length === 0 ? (
              <Empty
                icon={Receipt}
                title="No expenses logged this month"
                hint="Head to Weekly Entry to log your spend."
                action={
                  <Link to="/entry">
                    <Button size="sm">Open Weekly Entry</Button>
                  </Link>
                }
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
                    onClick={(data) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        setSelectedCategory(data.activePayload[0].payload.category);
                      } else {
                        setSelectedCategory(null);
                      }
                    }}
                  >
                    <XAxis
                      dataKey="label"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
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
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 8, padding: "8px 12px", color: "#e5e5e5", fontSize: 12 }}>
                              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{data.label}</div>
                              <div>{formatCurrency(data.amount)} spent this month</div>
                            </div>
                          );
                        }
                        return null; 
                      }}
                      triggerArea="all"
                    />
                    <Bar 
                      dataKey="amount" 
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell 
                          key={i} 
                          fill={selectedCategory === entry.category ? "#315fff" : "#fb7185"} 
                          fillOpacity={selectedCategory === entry.category ? 1 : 0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {selectedCategory && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">
                      Filtering by: <span className="font-medium text-neutral-200">{categoryLabel(selectedCategory)}</span>
                    </span>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent transactions"
            subtitle={
              selectedCategory 
                ? `Filtered by ${categoryLabel(selectedCategory)} · ${filteredTransactions.length} shown`
                : `${transactions.length} total`
            }
            action={
              <Link to="/entry" className="text-xs text-neutral-400 hover:text-neutral-200">
                View all
              </Link>
            }
          />
          <CardBody>
            {filteredTransactions.length === 0 ? (
              <Empty
                icon={Receipt}
                title={selectedCategory ? `No ${categoryLabel(selectedCategory)} expenses` : "Nothing logged yet"}
                hint={selectedCategory ? "Try selecting a different category." : "Start by recording a few transactions."}
              />
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <ul className="divide-y divide-neutral-900">
                  {filteredTransactions.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-neutral-200">
                          {t.note || categoryLabel(t.category, t.subCategory)}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {formatDate(t.date)} ·{" "}
                          <span className="capitalize">{t.type === "assetContribution" ? "asset contribution" : t.type}</span>
                        </p>
                      </div>
                      <span
                        className={`tabular shrink-0 text-sm font-medium ${
                          t.type === "expense" ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        {t.type === "expense" ? "−" : "+"}
                        {formatCurrency(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BalancesCard
          icon={Banknote}
          title="Bank balances"
          accounts={bankAccounts}
          emptyHint="Add a checking or savings account."
        />
        <BalancesCard
          icon={PiggyBank}
          title="Assets"
          accounts={assetAccounts}
          emptyHint="Track your 401k, IRA, or Emergency Fund."
        />
        <UpcomingRecurringCard recurring={recurring} debtPaymentDate={forecast.nextDebtPaymentDate} />
      </section>
    </div>
  );
}

function CreditCardsTable({ creditCards }) {
  if (creditCards.length === 0) {
    return (
      <Empty
        icon={CreditCard}
        title="No credit cards added"
        hint="Add a credit card under Accounts to enable forecasting."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900/50 text-left text-[11px] uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Card</th>
            <th className="px-4 py-2.5 text-right font-medium">Statement Bal.</th>
            <th className="px-4 py-2.5 text-right font-medium">Current Bal.</th>
            <th className="px-4 py-2.5 text-right font-medium">Closes</th>
            <th className="px-4 py-2.5 text-right font-medium">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {creditCards.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 text-neutral-200">{c.name}</td>
              <td className="tabular px-4 py-3 text-right text-neutral-100">
                {formatCurrency(c.lastStatementBalance)}
              </td>
              <td className="tabular px-4 py-3 text-right text-neutral-300">
                {formatCurrency(c.currentBalance)}
              </td>
              <td className="px-4 py-3 text-right text-neutral-400">
                {c.statementClosingDay ? ordinal(c.statementClosingDay) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-neutral-400">
                {c.paymentDueDay ? ordinal(c.paymentDueDay) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalancesCard({ icon: Icon, title, accounts, emptyHint }) {
  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Badge tone={total >= 0 ? "positive" : "negative"}>
            {formatCurrency(total)}
          </Badge>
        }
      />
      <CardBody>
        {accounts.length === 0 ? (
          <Empty icon={Icon} title="No accounts" hint={emptyHint} />
        ) : (
          <ul className="divide-y divide-neutral-900">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-neutral-200">{a.name}</span>
                <span className="tabular text-sm text-neutral-300">
                  {formatCurrency(a.balance)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function UpcomingRecurringCard({ recurring, debtPaymentDate }) {
  // Get next billing date for monthly recurring expenses
  const getNextRecurringDate = (dayOfMonth) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = Math.min(Math.max(1, Number(dayOfMonth) || 1), new Date(year, month + 1, 0).getDate());
    const thisMonthCandidate = new Date(year, month, day);
    if (thisMonthCandidate >= today) return thisMonthCandidate;
    return new Date(year, month + 1, Math.min(day, new Date(year, month + 2, 0).getDate()));
  };

  const combinedItems = useMemo(() => {
    const items = [];

    // Add recurring expenses with proper normalization
    (recurring || []).forEach(r => {
      const interval = r.interval || "monthly";
      let monthlyAmount = Number(r.amount || 0);

      // Normalize non-monthly recurring expenses to monthly equivalents
      if (interval === "quarterly") monthlyAmount /= 3;
      else if (interval === "biannually") monthlyAmount /= 6;
      else if (interval === "yearly") monthlyAmount /= 12;
      else if (interval === "custom") monthlyAmount /= (Number(r.customMonths) || 1);

      // Calculate next date based on interval
      let nextDate;
      if (interval === "monthly") {
        nextDate = getNextRecurringDate(r.billingDayOfMonth);
      } else if (r.startDate) {
        // Handle non-monthly intervals with start date
        const startDate = new Date(r.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let monthsToAdd = 1;
        if (interval === "quarterly") monthsToAdd = 3;
        else if (interval === "biannually") monthsToAdd = 6;
        else if (interval === "yearly") monthsToAdd = 12;
        else if (interval === "custom") monthsToAdd = Number(r.customMonths) || 1;

        let baseDate = r.lastBillingDate
          ? new Date(r.lastBillingDate)
          : new Date(startDate);

        nextDate = new Date(baseDate);
        while (nextDate < today) {
          nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
        }
      }

      items.push({
        ...r,
        type: 'recurring',
        nextDate,
        displayAmount: r.amount,
        monthlyAmount: monthlyAmount
      });
    });

    // Sort by next date
    return items.sort((a, b) => {
      if (!a.nextDate) return 1;
      if (!b.nextDate) return -1;
      return a.nextDate - b.nextDate;
    });
  }, [recurring]);

  const totalMonthly = combinedItems.reduce((s, item) => s + (item.monthlyAmount || 0), 0);

  return (
    <Card>
      <CardHeader
        title="Recurring bills"
        subtitle={
          debtPaymentDate
            ? `Next debt payment ${formatDate(debtPaymentDate)}`
            : undefined
        }
        action={<Badge tone="warning">{formatCurrency(totalMonthly)} / mo avg</Badge>}
      />
      <CardBody>
        {combinedItems.length === 0 ? (
          <Empty
            icon={CalendarClock}
            title="No recurring bills"
            hint="Add fixed costs like rent, Wi-Fi, or other regular expenses."
          />
        ) : (
          <ul className="divide-y divide-neutral-900">
            {combinedItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-neutral-200">{item.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {item.interval === "monthly"
                      ? `Bills on the ${ordinal(item.billingDayOfMonth)}`
                      : item.nextDate
                        ? `Renews ${formatDate(item.nextDate)}`
                        : "No start date"
                    }
                  </p>
                </div>
                <div className="text-right">
                  <span className="tabular text-sm text-neutral-300">
                    {formatCurrency(item.displayAmount)}
                  </span>
                  {item.interval && item.interval !== "monthly" && (
                    <p className="text-[10px] text-neutral-500">
                      {item.interval === "custom" ? `Every ${item.customMonths}mo` : item.interval}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function loggedIncomeThisMonth(transactions) {
  const now = new Date();
  return (transactions || [])
    .filter((t) => t.type === "income")
    .filter((t) => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}
