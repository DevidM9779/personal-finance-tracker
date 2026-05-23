import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ToastProvider } from "./components/Toast";

import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WeeklyEntry from "./pages/WeeklyEntry";
import Accounts from "./pages/Accounts";
import Recurring from "./pages/Recurring";
import Profile from "./pages/Profile";
import { useAuth } from "./hooks/useAuth";
import { useUserData } from "./hooks/useUserData";

export default function App() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenSpinner label="Loading session…" />;
  }

  if (!user) {
    return <Auth />;
  }

  return <AuthenticatedApp user={user} />;
}

function AuthenticatedApp({ user }) {
  const { profile, accounts, transactions, recurring, subscriptions, loading } = useUserData(
    user.uid
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <Navbar user={user} />
        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <FullScreenSpinner inline label="Loading your data…" />
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    profile={profile}
                    accounts={accounts}
                    transactions={transactions}
                    recurring={recurring}
                  />
                }
              />
              <Route
                path="/entry"
                element={
                  <WeeklyEntry
                    user={user}
                    accounts={accounts}
                    transactions={transactions}
                  />
                }
              />
              <Route
                path="/accounts"
                element={<Accounts user={user} accounts={accounts} />}
              />
              <Route
                path="/recurring"
                element={<Recurring user={user} recurring={recurring} />}
              />
              <Route
                path="/profile"
                element={<Profile user={user} profile={profile} />}
              />
            </Routes>
          )}
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-center text-[11px] text-neutral-600">
          Ledger · single-user personal finance tracker
        </footer>
      </div>
    </BrowserRouter>
  );
}

function FullScreenSpinner({ label, inline = false }) {
  return (
    <div
      className={`${
        inline
          ? "flex w-full items-center justify-center gap-3 py-24"
          : "flex min-h-screen items-center justify-center bg-neutral-950"
      } text-neutral-400`}
    >
      <Loader2 size={20} className="animate-spin text-emerald-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
