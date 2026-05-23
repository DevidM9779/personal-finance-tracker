import { useState } from "react";
import { Loader2, Plus, Repeat, Trash2, CalendarClock } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Field,
  Input,
} from "../components/ui";
import { formatCurrency, ordinal } from "../lib/format";
import { useToast, useToastedAction } from "../components/toastHooks";
import {
  createRecurring,
  deleteRecurring,
  updateRecurring,
} from "../lib/firestoreData";

const INTERVALS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Biannually" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

const EMPTY_FORM = { 
  name: "", 
  amount: "", 
  interval: "monthly",
  billingDayOfMonth: "1",
  startDate: new Date().toISOString().split('T')[0],
  customMonths: "2"
};

// Helper to calculate the next renewal date for non-monthly intervals
function calculateNextRenewal(sub) {
  if (!sub.startDate) return null;
  const start = new Date(sub.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let monthsToAdd = 1;
  if (sub.interval === "quarterly") monthsToAdd = 3;
  else if (sub.interval === "biannually") monthsToAdd = 6;
  else if (sub.interval === "yearly") monthsToAdd = 12;
  else if (sub.interval === "custom") monthsToAdd = Number(sub.customMonths) || 1;

  let next = new Date(start);
  while (next < today) {
    next.setMonth(next.getMonth() + monthsToAdd);
  }
  return next;
}

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export default function Recurring({ user, recurring }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const run = useToastedAction();

  async function onSubmit(e) {
    e.preventDefault();
    if (!user) return;
    const name = form.name.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "info" });
      return;
    }
    setSaving(true);
    try {
      await createRecurring(user.uid, {
        name,
        amount: Number(form.amount) || 0,
        interval: form.interval,
        ...(form.interval === "monthly" 
          ? { billingDayOfMonth: clampDay(form.billingDayOfMonth) } 
          : { 
              startDate: form.startDate,
              customMonths: form.interval === "custom" ? Number(form.customMonths) : null
            })
      });
      toast({ title: `${name} added`, variant: "success" });
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not add recurring expense",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  // Split data into monthly and long-term subscriptions
  const monthlyBills = recurring
    .filter(r => !r.interval || r.interval === "monthly")
    .sort((a, b) => Number(a.billingDayOfMonth) - Number(b.billingDayOfMonth));

  const otherSubs = recurring
    .filter(r => r.interval && r.interval !== "monthly")
    .map(sub => ({
      ...sub,
      nextRenewal: calculateNextRenewal(sub),
    }))
    .sort((a, b) => {
      if (!a.nextRenewal) return 1;
      if (!b.nextRenewal) return -1;
      return a.nextRenewal - b.nextRenewal;
    });

  const monthlyTotal = monthlyBills.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Recurring expenses
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Fixed bills & subscriptions
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          These bills are factored into the Debt Anticipation Engine alongside
          your credit card statement balances.
        </p>
      </header>

      <Card>
        <CardHeader title="Add recurring expense" />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Field label="Name" className="md:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rent, Wi-Fi, Spotify..."
              />
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="Interval">
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {INTERVALS.map((int) => (
                  <option key={int.value} value={int.value}>
                    {int.label}
                  </option>
                ))}
              </select>
            </Field>

            {form.interval === "monthly" ? (
              <Field label="Billing day" hint="Day of month (1–31)">
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.billingDayOfMonth}
                  onChange={(e) => setForm({ ...form, billingDayOfMonth: e.target.value })}
                />
              </Field>
            ) : (
              <>
                <Field label="Start date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </Field>
                {form.interval === "custom" && (
                  <Field label="Every X months">
                    <Input
                      type="number"
                      min="1"
                      value={form.customMonths}
                      onChange={(e) => setForm({ ...form, customMonths: e.target.value })}
                    />
                  </Field>
                )}
              </>
            )}

            <div className="flex items-end justify-end md:col-span-6 lg:col-span-1 lg:ml-auto">
              <Button type="submit" disabled={saving} className="w-full lg:w-auto">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* FRAME 1: Monthly Bills */}
      <Card>
        <CardHeader
          title="Monthly recurring"
          subtitle={`${monthlyBills.length} bill${monthlyBills.length === 1 ? "" : "s"}`}
          action={<Badge tone="warning">{formatCurrency(monthlyTotal)} / mo</Badge>}
        />
        <CardBody>
          {monthlyBills.length === 0 ? (
            <Empty icon={Repeat} title="No monthly bills" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/50 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium">Day</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {monthlyBills.map((r) => (
                    <RecurringRow key={r.id} recurring={r} user={user} run={run} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* FRAME 2: Long-Term Subscriptions */}
      <Card>
        <CardHeader
          title="Long-term subscriptions"
          subtitle={`${otherSubs.length} subscription${otherSubs.length === 1 ? "" : "s"}`}
        />
        <CardBody>
          {otherSubs.length === 0 ? (
            <Empty icon={CalendarClock} title="No extra subscriptions" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/50 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium">Interval</th>
                    <th className="px-4 py-2.5 text-right font-medium">Next Renewal</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {otherSubs.map((r) => (
                    <SubscriptionRow key={r.id} recurring={r} user={user} run={run} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// Sub-component for Monthly rows
function RecurringRow({ recurring, user, run }) {
  return (
    <tr>
      <td className="px-4 py-3 text-neutral-200">{recurring.name}</td>
      <td className="tabular px-4 py-3 text-right text-neutral-100">
        {formatCurrency(recurring.amount)}
      </td>
      <td className="px-4 py-3 text-right text-neutral-400">
        {ordinal(recurring.billingDayOfMonth)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete ${recurring.name}?`)) {
              run(() => deleteRecurring(user.uid, recurring.id), {
                successMessage: "Removed",
                errorMessage: "Could not delete",
              });
            }
          }}
          className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

// Sub-component for Long-Term rows
function SubscriptionRow({ recurring, user, run }) {
  const daysUntil = getDaysUntil(recurring.nextRenewal);
  
  function getIntervalLabel() {
    if (recurring.interval === "custom") return `Every ${recurring.customMonths} mo`;
    const interval = INTERVALS.find(i => i.value === recurring.interval);
    return interval ? interval.label : recurring.interval;
  }

  return (
    <tr>
      <td className="px-4 py-3 text-neutral-200">{recurring.name}</td>
      <td className="tabular px-4 py-3 text-right text-neutral-100">
        {formatCurrency(recurring.amount)}
      </td>
      <td className="px-4 py-3 text-right text-neutral-400">
        {getIntervalLabel()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className="text-neutral-100">{formatDate(recurring.nextRenewal)}</span>
          {daysUntil !== null && (
            <span className={`text-xs ${daysUntil <= 7 ? "text-amber-400" : "text-neutral-500"}`}>
              {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete ${recurring.name}?`)) {
              run(() => deleteRecurring(user.uid, recurring.id), {
                successMessage: "Removed",
                errorMessage: "Could not delete",
              });
            }
          }}
          className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), 31);
}