import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { formatCurrency } from "../lib/format";

export default function CashFlowSankey({ transactions, accounts, selectedMonth }) {
  const sankeyData = useMemo(() => {
    // Use selected month if provided, otherwise use current month
    const targetDate = selectedMonth ? new Date(selectedMonth) : new Date();
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // Calculate income by account
    const incomeByAccount = {};
    transactions
      .filter(t => {
        if (t.type !== "income") return false;
        const txDate = new Date(t.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      })
      .forEach(t => {
        const accountId = t.accountId || "unknown";
        incomeByAccount[accountId] = (incomeByAccount[accountId] || 0) + Number(t.amount || 0);
      });

    // Get total income
    const totalIncome = Object.values(incomeByAccount).reduce((sum, val) => sum + val, 0);

    // If no income data, return empty structure
    if (totalIncome === 0) {
      return { nodes: [], links: [] };
    }

    // Create account name lookup
    const accountNames = {};
    accounts.forEach(account => {
      accountNames[account.id] = account.name;
    });

    // Sort income accounts by amount (descending)
    const sortedIncomeAccounts = Object.entries(incomeByAccount)
      .sort(([, a], [, b]) => b - a)
      .map(([accountId]) => accountId);

    // Calculate variable expenses by category
    const categorySpending = {};
    transactions
      .filter(t => {
        if (t.type !== "expense") return false;
        const txDate = new Date(t.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      })
      .forEach(t => {
        const category = t.category || "misc";
        categorySpending[category] = (categorySpending[category] || 0) + Number(t.amount || 0);
      });

    // Calculate savings/investments (asset contributions)
    const savings = transactions
      .filter(t => {
        if (t.type !== "assetContribution") return false;
        const txDate = new Date(t.date);
        return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Calculate remaining (income - expenses - savings)
    const remaining = Math.max(0, totalIncome - Object.values(categorySpending).reduce((a, b) => a + b, 0) - savings);

    // Sort expense categories by amount (descending) and handle small values
    const totalExpenses = Object.values(categorySpending).reduce((a, b) => a + b, 0);
    const threshold = totalExpenses * 0.03; // Group categories less than 3% of total

    let otherExpenses = 0;
    const majorCategories = [];
    const minorCategories = [];

    Object.entries(categorySpending).forEach(([category, amount]) => {
      if (amount < threshold && amount > 0) {
        otherExpenses += amount;
        minorCategories.push(category);
      } else if (amount > 0) {
        majorCategories.push([category, amount]);
      }
    });

    // Sort major categories by amount (descending)
    majorCategories.sort(([, a], [, b]) => b - a);

    const sortedExpenseCategories = majorCategories.map(([category]) => category);

    // Build unified Sankey nodes and links: Income Sources → Total Income → Expense Categories
    const expenseNodes = sortedExpenseCategories.map(cat => ({ id: cat }));

    // Add "Other" category if there are minor expenses
    if (otherExpenses > 0) {
      expenseNodes.push({ id: "Other Expenses" });
    }

    // Only add savings and remaining if they have values
    if (savings > 0) {
      expenseNodes.push({ id: "Asset Contributions" });
    }
    if (remaining > 0) {
      expenseNodes.push({ id: "Remaining" });
    }

    const nodes = [
      // Income sources (left column)
      ...sortedIncomeAccounts
        .filter(accountId => incomeByAccount[accountId] > 0)
        .map(accountId => ({
        id: accountNames[accountId] || `Account ${accountId.slice(0, 6)}`
      })),
      // Central Total Income node (middle column) - hidden label
      { id: "Total Income", label: "" },
      // Expense categories (right column)
      ...expenseNodes,
    ];

    const links = [
      // Income sources → Total Income (GREEN FLOWS)
      ...sortedIncomeAccounts
        .filter(accountId => incomeByAccount[accountId] > 0)
        .map(accountId => ({
        source: accountNames[accountId] || `Account ${accountId.slice(0, 6)}`,
        target: "Total Income",
        value: incomeByAccount[accountId],
        type: 'income' // Mark as income flow for coloring
      })),
      // Total Income → Expense categories (RED FLOWS)
      ...sortedExpenseCategories.map(category => ({
        source: "Total Income",
        target: category,
        value: categorySpending[category],
        type: 'expense' // Mark as expense flow for coloring
      })),
      // Total Income → Other Expenses (if applicable) (RED FLOW)
      ...(otherExpenses > 0 ? [{
        source: "Total Income",
        target: "Other Expenses",
        value: otherExpenses,
        type: 'expense'
      }] : []),
      // Total Income → Savings (NEUTRAL FLOW - could be considered positive)
      ...(savings > 0 ? [{
        source: "Total Income",
        target: "Asset Contributions",
        value: savings,
        type: 'savings'
      }] : []),
      // Total Income → Remaining (NEUTRAL FLOW)
      ...(remaining > 0 ? [{
        source: "Total Income",
        target: "Remaining",
        value: remaining,
        type: 'remaining'
      }] : []),
    ].filter(link => link.value > 0 && link.value !== null && link.value !== undefined);

    return { nodes, links };
  }, [transactions, accounts, selectedMonth]);

  if (sankeyData.links.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-neutral-500">
        No cash flow data available for this month
      </div>
    );
  }

  // Custom color function for semantic flow coloring
  const getLinkColor = (link) => {
    if (link.type === 'income') return 'rgba(52, 211, 153, 0.4)'; // Muted green for income
    if (link.type === 'expense') return 'rgba(248, 113, 113, 0.4)'; // Muted red for expenses
    if (link.type === 'savings') return 'rgba(96, 165, 250, 0.4)'; // Blue for savings
    if (link.type === 'remaining') return 'rgba(167, 139, 250, 0.4)'; // Purple for remaining
    return 'rgba(156, 163, 175, 0.4)'; // Default gray
  };

  // Custom color function for nodes
  const getNodeColor = (node) => {
    if (node.id === 'Total Income') return '#fbbf24'; // Amber for central node
    if (node.id === 'Asset Contributions') return '#60a5fa'; // Blue for savings
    if (node.id === 'Remaining') return '#a78bfa'; // Purple for remaining
    if (node.id === 'Other Expenses') return '#9ca3af'; // Gray for other
    return '#34d399'; // Default green for income sources
  };

  return (
    <div style={{ height: "400px" }}>
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 30, right: 160, bottom: 30, left: 160 }}
          align="justify"
          colors={getNodeColor}
          nodeOpacity={0.95}
          nodeHoverOpacity={1}
          nodeThickness={6}
          nodeInnerPadding={8}
          nodeSpacing={8}
          nodeBorderWidth={1}
          nodeBorderColor="#374151"
          linkOpacity={0.5}
          linkHoverOpacity={0.8}
          linkHoverOthersOpacity={0.1}
          enableLinkGradient={false}
          linkBlendMode="normal"
          linkContract={2}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={16}
          labelTextColor={(node) => node.id === "Total Income" ? "transparent" : "#e5e7eb"}
          linkColor={getLinkColor}
          theme={{
            background: "transparent",
            labels: {
              text: {
                fontSize: 10,
                fill: "#e5e7eb",
                fontWeight: 500,
                fontFamily: "Inter, system-ui, sans-serif",
              },
            },
            tooltip: {
              container: {
                background: "#18181b",
                color: "#e5e7eb",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #3f3f46",
                padding: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
              },
            },
          }}
          tooltip={({ node, link }) => {
            if (link) {
              return (
                <div>
                  <strong style={{ color: "#e5e7eb", fontSize: "14px" }}>
                    {link.source.id} → {link.target.id}
                  </strong>
                  <br />
                  <span style={{ color: "#a1a1aa", fontSize: "13px" }}>{formatCurrency(link.value)}</span>
                </div>
              );
            }
            if (node) {
              return <strong style={{ color: "#e5e7eb", fontSize: "14px" }}>{node.id}</strong>;
            }
            return null;
          }}
        />
      </div>
  );
}