// Strict expense category taxonomy required by the product spec.
// Adding categories outside this list should require a deliberate update.

export const EXPENSE_CATEGORIES = [
  { id: "groceries", label: "Groceries" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "gasoline", label: "Gasoline" },
  {
    id: "apartment",
    label: "Apartment",
    subTags: [
      { id: "wifi", label: "Wi-Fi" },
      { id: "rent", label: "Rent" },
      { id: "gas", label: "Gas" },
      { id: "electricity", label: "Electricity" },
      { id: "water", label: "Water" },
      { id: "fees", label: "Fees" },
    ],
  },
  { id: "restaurants_dates", label: "Restaurants / Dates" },
  { id: "misc", label: "Miscellaneous" },
];

export const EXPENSE_CATEGORY_MAP = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.id, c])
);

export function categoryLabel(id, subTagId) {
  const cat = EXPENSE_CATEGORY_MAP[id];
  if (!cat) return id || "—";
  if (subTagId && cat.subTags) {
    const sub = cat.subTags.find((s) => s.id === subTagId);
    if (sub) return `${cat.label} · ${sub.label}`;
  }
  return cat.label;
}

export const TRANSACTION_TYPES = [
  { id: "expense", label: "Expense" },
  { id: "income", label: "Income" },
  { id: "assetContribution", label: "Asset Contribution" },
];

export const ACCOUNT_TYPES = [
  { id: "bank", label: "Bank · Checking / Savings" },
  { id: "asset", label: "Asset · 401k, IRA, Emergency Fund" },
  { id: "creditCard", label: "Credit Card" },
];

export const ACCOUNT_TYPE_LABEL = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.id, t.label])
);
