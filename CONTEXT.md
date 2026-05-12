# CONTEXT.md

A living design and architecture document for the Personal Finance Tracker.
Read this before extending the app — it captures the *why* behind the
decisions, not just the *what*.

---

## 1. Goal & Scope

The app is a **single-user, premium personal finance tracker** with a very
specific value prop: **forecast cash-flow so the user never carries a credit
card statement balance into interest territory**.

That goal drives every architectural decision in this codebase:

- Data is captured weekly through a fast multi-row entry UI (no friction =
  habit forming).
- The dashboard is forecast-first, not journal-first. It surfaces *what
  will happen next* (cash needed on `preferredDebtPaymentDayOfMonth`), not
  just historical spending.
- Recurring expenses and statement balances are first-class entities so the
  forecast is precise.

Out of scope (deliberately): multi-user collaboration, bill payment, bank
syncing (Plaid/MX), tax tools.

---

## 2. Tech Stack Rationale

| Layer            | Choice                                             | Why                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend         | React 19 + Vite                                    | Small, fast, mainstream, and a proven match for the rest of the org's apps (see `webtoon-tracker`).                                                                                                                       |
| Styling          | Tailwind v4 (`@tailwindcss/vite`)                  | Zero-config theme, tight DX, and trivial to enforce the minimalist mono + emerald/rose palette.                                                                                                                           |
| Icons            | `lucide-react`                                     | Premium, geometric, tree-shaken.                                                                                                                                                                                          |
| Charts           | `recharts`                                         | Declarative React components, ResponsiveContainer makes the bar chart trivial.                                                                                                                                            |
| Routing          | `react-router-dom@7`                               | Standard, file-light, supports `NavLink` styling.                                                                                                                                                                         |
| Auth             | Firebase Authentication (email/password)           | One-step setup, free tier, official emulator for offline dev. Real remote auth is one config switch away.                                                                                                                 |
| Database         | Cloud Firestore                                    | Satisfies *"data must be persisted in a real remote or local database, not browser local storage"*; pairs naturally with Firebase Auth; supports realtime snapshots so the dashboard reacts as data changes.              |
| Local dev DB     | Firebase Emulator Suite                            | Lets a contributor run the entire stack on `localhost` with one command (`npm run dev:all`), without provisioning Firebase. The same rules and data shape apply.                                                          |
| Hosting          | Firebase Hosting                                   | The dist bundle is fully static; `firebase deploy --only hosting` ships the app in seconds.                                                                                                                               |

We chose Firebase over a custom backend because:

- Single-user finance data is small (< 10 MB lifetime). A managed document
  database is the right abstraction.
- Firebase's security rules express "users can only see their own data" in
  ~10 lines, which is the entire surface area of our auth model.
- No bespoke API server to operate, no separate auth issuer, no JWT plumbing.

---

## 3. Data Model

All financial data is nested under `users/{uid}` to make security rules
trivial and uniform.

```
users/{uid}
  email, displayName
  expectedMonthlyIncome              number      (required for profile UX)
  preferredDebtPaymentDayOfMonth     number 1-31 (drives the forecast engine)
  createdAt                          server timestamp

users/{uid}/accounts/{accountId}
  name                               string
  type                               "bank" | "asset" | "creditCard"
  isActive                           boolean (soft delete)

  // bank / asset:
  balance                            number

  // creditCard:
  currentBalance                     number     (what's owed right now)
  lastStatementBalance               number     (what closed at last cycle close)
  statementClosingDay                number 1-31
  paymentDueDay                      number 1-31

users/{uid}/transactions/{txId}
  date                               YYYY-MM-DD
  amount                             number (always positive; type carries sign)
  type                               "expense" | "income" | "assetContribution"
  category                           string      (only for expenses)
  subCategory                        string      (optional, only for expenses with sub-tags)
  accountId                          string      (optional source/destination)
  note                               string?

users/{uid}/recurringExpenses/{id}
  name                               string
  amount                             number
  billingDayOfMonth                  number 1-31
```

### Strict category taxonomy

The expense category list is encoded in `src/lib/categories.js` and is
deliberately closed (matches the spec exactly):

- Groceries, Subscriptions, Gasoline, Restaurants/Dates, Miscellaneous, and
- Apartment with sub-tags Wi-Fi, Rent, Gas, Electricity, Water, Fees.

Extending the taxonomy is an explicit code edit, not a free-text user input,
to keep month-over-month category comparisons meaningful.

### Why no `Transactions` adjusting card balances automatically?

We let the user manually update `currentBalance` and `lastStatementBalance`
on each credit card via the Weekly Entry page (see "Update credit card
balances" section). Rationale:

- Real-world reconciliation never matches the user's free-form logs
  perfectly (chargebacks, refunds, statement credits, points, etc).
- The user already opens their card statement weekly; copying the two
  numbers is faster and more accurate than running an auto-aggregator.
- This keeps the forecasting engine deterministic — it consumes the
  user-confirmed source of truth.

If we ever add Plaid/MX, we can populate these fields automatically.

---

## 4. Security Model

`firestore.rules` enforces a single rule:

> A request must be authenticated AND `request.auth.uid` must equal the
> `{userId}` segment of the document path.

This means **no user can ever read or write data outside their own `users/{uid}`
subtree**, regardless of which page is rendered. Default-deny is set at the
catch-all matcher.

Authentication itself is email/password (Firebase Auth), with the option of
swapping in OAuth providers later without changing the data model.

---

## 5. The Forecasting Engine

All forecast math lives in `src/lib/forecast.js` and is pure & deterministic
so it can be unit tested.

### Net worth

```
netWorth = sumLiquidCash(accounts) + sumAssets(accounts)
         − sumCreditDebt(accounts)
```

- `sumLiquidCash` = sum of `balance` on active `bank` accounts.
- `sumAssets`     = sum of `balance` on active `asset` accounts.
- `sumCreditDebt` = sum of `currentBalance` on active `creditCard` accounts.

### Next debt payment date

`nextDateOnDay(preferredDebtPaymentDayOfMonth)` returns the next calendar
day ≥ today that matches the configured day-of-month. If today equals or
is past that day for the current month, the next month is used.

Edge cases (e.g. picking day 31 in February) are clamped to the last day of
the target month.

### Anticipated debt

`anticipatedDebt = sum(creditCard.lastStatementBalance)` across all active
cards. This is the amount the user owes the moment they reach the next
`preferredDebtPaymentDayOfMonth`.

### Upcoming recurring expenses

`upcomingRecurringTotal(recurring, nextDebtPaymentDate)` walks each recurring
expense month-by-month between today and the next payment date and sums
each occurrence whose anchored billing day falls inside the window.

### Liquidity check

```
totalCashNeeded = anticipatedDebt + upcomingRecurring
cashShortfall  = totalCashNeeded − liquidCash
needsEmergencyWithdrawal = cashShortfall > 0
```

When `needsEmergencyWithdrawal` is true, the dashboard renders a rose-toned
banner with the exact shortfall and a recommendation to top up from the
Emergency Fund.

### Expenses-by-category chart

`expensesByCategoryThisMonth(transactions)` filters expenses to the current
calendar month, groups by category, and feeds Recharts a `[ { label, amount } ]`
series.

---

## 6. UI/UX Decisions

### Aesthetic

- **Monochrome base.** Neutral-950 background, neutral-100 text, neutral-800
  borders. Cards are subtly translucent (`bg-neutral-900/60`) to add depth
  without color noise.
- **Color is information.** Emerald for positives (net worth, income,
  primary CTAs). Rose for negatives (debt, expense rows, liquidity
  warnings). Amber for "heads up" (recurring expense total).
- **Tabular numerics.** Numbers use tabular figures
  (`font-variant-numeric: tabular-nums`) so columns of currency align
  precisely.
- **Type scale.** Inter for UI, 11–14px body, 2xl semibold for stat hero
  values. Keep tracking tight, follow the Stripe/Linear "boring on
  purpose" feel.

### Feedback

- Inline loading states (`Loader2` spinner) on every async button.
- A reusable toast system (`src/components/Toast.jsx` + `toastHooks.js`)
  emits success/error notifications on every CRUD action so the user
  always sees that their data hit Firestore.

### Density

- Dashboard fits the full forecast above the fold on a 1280×800 viewport.
- Weekly entry is multi-row so the user can log a week in 30s.

---

## 7. Where to extend next

| Area                       | Why                                                                                                       | Suggested approach                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Asset auto-update          | 401k, IRA balances drift weekly.                                                                          | Add a "Refresh assets" modal that lets the user paste the current balance.      |
| Plaid / MX integration     | Eliminate manual credit card balance entry.                                                               | Hide behind a feature flag; map Plaid liabilities into the existing schema.      |
| OAuth login                | Less password management.                                                                                  | `GoogleAuthProvider` / `OAuthProvider` plug straight into `Auth.jsx`.            |
| Mobile install             | The app is responsive but not yet a PWA.                                                                  | Add `manifest.webmanifest` + service worker via `vite-plugin-pwa`.               |
| Backups                    | Firestore can be exported on a schedule.                                                                  | Configure a scheduled GCS export from the Firebase console.                     |
| Unit tests                 | Forecast math is pure — perfect for Vitest.                                                                | Add `vitest` + tests for `forecast.js` first; expand from there.                 |

---

## 8. Conventions

- **Imports at the top.** No nested imports inside functions.
- **Tailwind first.** No CSS modules; one global `index.css` for variables.
- **Hooks at the top of components.** Derived state via `useMemo`, not
  effects, where possible.
- **Plain JS.** No TypeScript — keeps the surface area tiny and matches the
  rest of the org's web apps. Convert later if useful.
- **No mutation of Firestore docs in place.** All writes go through helpers
  in `src/lib/firestoreData.js`, which centralize the `updatedAt` stamping.

---

## 9. Changelog

- **2026-05-12** — Initial implementation. Auth, accounts (bank/asset/credit
  card), transactions, recurring expenses, profile preferences, dashboard
  with Debt Anticipation Engine + Liquidity Alert + category chart, Firebase
  emulator support, and documentation.
