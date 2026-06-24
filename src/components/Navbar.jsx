import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  LayoutDashboard,
  PencilLine,
  Wallet,
  Repeat,
  BarChart3,
  User,
  LogOut,
  CircleDollarSign,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/entry", label: "Weekly Entry", icon: PencilLine },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Navbar({ user }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-900/80 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CircleDollarSign size={16} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-neutral-100">
              Ledger
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Personal Finance
            </p>
          </div>
        </div>
        <nav className="hidden gap-1 md:flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-neutral-400">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-800"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-neutral-900/80 px-2 py-2 md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? "bg-neutral-900 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
              }`
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
