// Forecasting engine for the personal finance tracker.
//
// The dashboard cross-references credit card statement balances against the
// user's `preferredDebtPaymentDayOfMonth` and the next round of recurring
// expenses to determine if liquid cash will be sufficient on that date.

function clampDay(day, year, month) {
  // month is 0-indexed for Date. Returns a valid day for the given month.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, Number(day) || 1), lastDayOfMonth);
}

/**
 * Return the next date (>= today) that lands on the given day-of-month.
 * If `day` has already passed this month, returns the same day next month.
 */
export function nextDateOnDay(day, from = new Date()) {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const thisMonthCandidate = new Date(
    year,
    month,
    clampDay(day, year, month)
  );
  if (thisMonthCandidate >= today) return thisMonthCandidate;
  return new Date(year, month + 1, clampDay(day, year, month + 1));
}

export function sumLiquidCash(accounts) {
  return (accounts || [])
    .filter((a) => a.type === "bank" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
}

export function sumAssets(accounts) {
  return (accounts || [])
    .filter((a) => a.type === "asset" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
}

export function sumCreditDebt(accounts) {
  return (accounts || [])
    .filter((a) => a.type === "creditCard" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);
}

export function sumStatementBalances(accounts) {
  return (accounts || [])
    .filter((a) => a.type === "creditCard" && a.isActive !== false)
    .reduce((sum, a) => sum + Number(a.lastStatementBalance || 0), 0);
}

export function netWorth(accounts) {
  return sumLiquidCash(accounts) + sumAssets(accounts) - sumCreditDebt(accounts);
}

/**
 * Compute the upcoming recurring expense burden that will hit the user's bank
 * accounts between today and the next debt payment date (inclusive).
 */
export function upcomingRecurringTotal(recurring, debtPaymentDate, from = new Date()) {
  if (!debtPaymentDate) return 0;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(debtPaymentDate);
  end.setHours(23, 59, 59, 999);

  let total = 0;
  for (const r of recurring || []) {
    const day = Number(r.billingDayOfMonth);
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;
    // Walk month-by-month from `start` to `end` and see whether each
    // anchored billing date lands inside the window.
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const billingDate = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        clampDay(day, cursor.getFullYear(), cursor.getMonth())
      );
      if (billingDate >= start && billingDate <= end) {
        total += Number(r.amount || 0);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return total;
}

/**
 * Build the full forecast snapshot used by the dashboard.
 */
export function buildForecast({ accounts = [], recurring = [], profile = {} }, now = new Date()) {
  const liquidCash = sumLiquidCash(accounts);
  const assets = sumAssets(accounts);
  const creditDebt = sumCreditDebt(accounts);
  const anticipatedDebt = sumStatementBalances(accounts);

  const debtPaymentDay = Number(profile?.preferredDebtPaymentDayOfMonth) || null;
  const nextDebtPaymentDate = debtPaymentDay
    ? nextDateOnDay(debtPaymentDay, now)
    : null;

  const upcomingRecurring = upcomingRecurringTotal(recurring, nextDebtPaymentDate, now);
  const totalCashNeeded = anticipatedDebt + upcomingRecurring;
  const cashShortfall = totalCashNeeded - liquidCash;

  return {
    liquidCash,
    assets,
    creditDebt,
    anticipatedDebt,
    upcomingRecurring,
    totalCashNeeded,
    cashShortfall,
    needsEmergencyWithdrawal: cashShortfall > 0,
    nextDebtPaymentDate,
    netWorth: liquidCash + assets - creditDebt,
  };
}

/**
 * Aggregate transactions into per-category totals for the current month.
 */
export function expensesByCategoryThisMonth(transactions, now = new Date()) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const totals = new Map();
  for (const t of transactions || []) {
    if (t.type !== "expense") continue;
    if (!t.date) continue;
    const d = new Date(t.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    const key = t.category || "misc";
    totals.set(key, (totals.get(key) || 0) + Number(t.amount || 0));
  }
  return Array.from(totals.entries()).map(([category, amount]) => ({ category, amount }));
}
