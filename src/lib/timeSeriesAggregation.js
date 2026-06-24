/**
 * Aggregate transactions by time period (week/month)
 */

/**
 * Get the start of the week for a given date (Monday-based)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0); // Normalize to midnight
  return weekStart;
}

/**
 * Get the end of the week for a given date (Sunday)
 */
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999); // End of day
  return weekEnd;
}

/**
 * Group transactions by week
 */
export function groupTransactionsByWeek(transactions, weeksBack = 12) {
  const weeks = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to midnight

  for (let i = 0; i < weeksBack; i++) {
    // Create new date objects to avoid mutation
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999); // End of the day

    const weekStart = getWeekStart(weekEnd);

    const weekTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0); // Normalize transaction date
      return txDate >= weekStart && txDate <= weekEnd;
    });

    const totalExpenses = weekTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalIncome = weekTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    weeks.push({
      label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      expenses: totalExpenses,
      income: totalIncome,
      net: totalIncome - totalExpenses,
    });
  }

  return weeks.reverse();
}

/**
 * Group transactions by month
 */
export function groupTransactionsByMonth(transactions, monthsBack = 12) {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < monthsBack; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const monthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === month && txDate.getFullYear() === year;
    });
    
    const totalExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const monthName = monthDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    
    months.push({
      year,
      month: month + 1, // 1-12
      monthName,
      expenses: totalExpenses,
      income: totalIncome,
      net: totalIncome - totalExpenses,
    });
  }
  
  return months.reverse();
}

/**
 * Group transactions by category for a specific time period
 */
export function groupTransactionsByCategory(transactions, startDate, endDate) {
  const categoryTotals = {};
  
  const filteredTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= startDate && txDate <= endDate;
  });
  
  filteredTransactions.forEach(t => {
    if (t.type !== 'expense') return;
    const category = t.category || 'misc';
    categoryTotals[category] = (categoryTotals[category] || 0) + Number(t.amount || 0);
  });
  
  return Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount,
  }));
}