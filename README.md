# Ledger · Personal Finance Tracker

A premium, single-user personal finance tracker built to log expenses, monitor
asset growth, and — most importantly — **forecast cash-flow so credit card
statement balances are paid on time without ever paying interest**.

Built with React, Vite, Firebase (Auth + Firestore), Tailwind v4, and Recharts.
Designed with a minimalist, monochrome aesthetic in the spirit of Stripe and
Linear.

![Ledger dashboard](docs/dashboard-preview.png)

---

## Highlights

- **Strict single-user auth.** Email + password authentication backed by
  Firebase. Firestore security rules deny all access except for the data nested
  under the authenticated user's own `/users/{uid}` document.
- **Strict expense taxonomy.** Groceries, Subscriptions, Gasoline, Apartment
  (with sub-tags Wi-Fi, Rent, Gas, Electricity, Water, Fees),
  Restaurants/Dates, and Miscellaneous — exactly as specified.
- **Weekly Data Entry form.** Add many transactions in one go, then update
  every active credit card's current and statement balances in the same view.
- **Debt Anticipation Engine.** Cross-references credit card statement
  balances and statement closing days against your preferred debt payment day
  of the month to calculate the exact amount of liquid cash needed on that
  date.
- **Liquidity Alert.** If
  `(anticipated debt + upcoming recurring expenses) > current liquid cash`,
  the dashboard renders a clear warning recommending a withdrawal from your
  Emergency Fund or other assets.
- **Net Worth Snapshot.** `(Liquid Cash + Assets) − Total Credit Card Debt` in
  a glance, with a monthly bar chart of expenses by category.

---

## Tech stack

| Layer            | Choice                                             |
| ---------------- | -------------------------------------------------- |
| UI               | React 19 + Vite + Tailwind v4 + lucide-react icons |
| Charts           | Recharts                                           |
| Routing          | React Router v7                                    |
| Authentication   | Firebase Auth (email/password)                     |
| Database         | Cloud Firestore                                    |
| Local dev DB     | Firebase Emulator Suite (Auth + Firestore)         |
| Hosting          | Firebase Hosting (static `dist/`)                  |

The project intentionally avoids browser `localStorage` for persistence — all
data lives in Firestore.

---

## Project layout

```
src/
  App.jsx                  Root, auth gate, routing.
  firebase.js              Firebase init + emulator wiring.
  components/
    Navbar.jsx             Top-of-app navigation.
    Toast.jsx              Toast provider + UI.
    toastContext.js        React context for the toast system.
    toastHooks.js          useToast / useToastedAction hooks.
    ui.jsx                 Tailwind UI primitives (Card, Button, Field, ...).
  hooks/
    useAuth.js             Subscribes to Firebase auth state, ensures profile doc.
    useUserData.js         Snapshots accounts / transactions / recurring / profile.
  lib/
    categories.js          Strict category + sub-tag definitions.
    firestoreData.js       CRUD helpers + collection refs.
    forecast.js            Net worth + debt anticipation engine.
    format.js              Currency / date formatters.
  pages/
    Auth.jsx               Email/password sign in & sign up.
    Dashboard.jsx          Forecast + net worth snapshot + category chart.
    WeeklyEntry.jsx        Multi-row weekly entry + CC balance updates.
    Accounts.jsx           Manage banks / assets / credit cards.
    Recurring.jsx          Manage fixed recurring monthly expenses.
    Profile.jsx            User preferences (income + debt payment day).
firebase.json              Emulator + hosting config.
firestore.rules            Per-user lockdown.
```

---

## Data model

All data lives under `users/{uid}` so that Firestore rules can enforce a
hard boundary between accounts.

```
users/{uid}
  email, displayName
  expectedMonthlyIncome: number
  preferredDebtPaymentDayOfMonth: number (1–31)

users/{uid}/accounts/{accountId}
  name: string
  type: "bank" | "asset" | "creditCard"
  isActive: boolean

  // bank / asset
  balance: number

  // creditCard
  currentBalance: number
  lastStatementBalance: number
  statementClosingDay: number (1–31)
  paymentDueDay: number (1–31)

users/{uid}/transactions/{transactionId}
  date: string (YYYY-MM-DD)
  amount: number
  type: "expense" | "income" | "assetContribution"
  category?: string         // expense category id
  subCategory?: string      // optional sub-tag (e.g. apartment.rent)
  accountId?: string        // optional source/destination account
  note?: string

users/{uid}/recurringExpenses/{recurringId}
  name: string
  amount: number
  billingDayOfMonth: number (1–31)
```

---

## Running locally

### Prerequisites

- Node.js 22+
- Java 21+ (required by the Firebase emulators)
- `npm install -g firebase-tools` (only needed to run the emulators)

### One-shot dev environment

```bash
npm install
npm run dev:all   # runs Firebase emulators + Vite dev server in parallel
```

Then open:

- **App:** http://localhost:5173
- **Firebase Emulator UI:** http://localhost:4000

The dev server auto-connects to the local emulators (Auth on `:9099`,
Firestore on `:8080`) when the Vite dev server is running. Sign up with any
email/password — accounts only live in the local emulator until you opt in to
a real Firebase project.

### Run them independently

```bash
npm run emulators   # tab 1
npm run dev         # tab 2
```

### Production build

```bash
npm run build       # outputs static assets to dist/
npm run preview     # serves dist/ for local verification
```

---

## Deploying to Firebase Hosting

1. Create a Firebase project with Authentication (Email/Password) and Cloud
   Firestore enabled.
2. Copy `.env.example` to `.env.local` and fill in your Firebase web app
   credentials:

   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_USE_FIREBASE_EMULATORS=false
   ```

3. Update `.firebaserc` with the production project id (or use
   `firebase use --add`).
4. Deploy security rules + the built site:

   ```bash
   npm run build
   firebase deploy --only firestore:rules,hosting
   ```

---

## Available scripts

| Script               | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Vite dev server (auto-connects to emulators in dev).     |
| `npm run emulators`  | Firebase Auth + Firestore + Hosting emulators.           |
| `npm run dev:all`    | `dev` + `emulators` together via `concurrently`.         |
| `npm run build`      | Production build to `dist/`.                             |
| `npm run preview`    | Serve the built `dist/`.                                 |
| `npm run lint`       | Run ESLint.                                              |

---

## Further reading

- **[CONTEXT.md](./CONTEXT.md)** — design decisions, architecture, forecasting
  formulas, and where to extend the app next.
