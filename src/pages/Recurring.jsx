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
import { formatCurrency, ordinal, getTodayEST, formatDateEST } from "../lib/format";
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
  startDate: getTodayEST(),
  customMonths: "2"
};

function calculateNextRenewal(sub) {
  if (!sub.startDate) return null;
  // Safely parse the YYYY-MM-DD string anchored to midnight EST
  const start = new Date(`${sub.startDate}T00:00:00`);
  const today = new Date(`${getTodayEST()}T00:00:00`);

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

function getDaysUntil(date) {
  if (!date) return null;
  const today = new Date(`${getTodayEST()}T00:00:00`);
  const target = new Date(date);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), 31);
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
      setForm({ ...EMPTY_FORM, startDate: getTodayEST() }); // Reset with fresh date
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
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <Field label="Name" className="md:col-span-4">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rent, Wi-Fi, Spotify..."
              />
            </Field>
            
            <Field label="Amount" className="md:col-span-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            
            <Field label="Interval" className="md:col-span-2">
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
              <Field label="Billing day" hint="Day (1–31)" className="md:col-span-2">
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
                <Field label="Start date" className="md:col-span-2">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </Field>
                {form.interval === "custom" && (
                  <Field label="Every X months" className="md:col-span-2">
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

            {form.interval === "custom" ? (
              <div className="flex justify-end md:col-span-12 mt-1">
                <Button type="submit" disabled={saving} className="w-full md:w-auto">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add
                </Button>
              </div>
            ) : (
              <Field label={"\u00A0"} className="md:col-span-2">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add
                </Button>
              </Field>
            )}
          </form>
        </CardBody>
      </Card>

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

function RecurringRow({ recurring, user, run }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(recurring.name);
  const [amount, setAmount] = useState(recurring.amount ?? "");
  const [day, setDay] = useState(recurring.billingDayOfMonth ?? 1);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      await run(() => updateRecurring(user.uid, recurring.id, {
        name: name.trim() || recurring.name,
        amount: Number(amount) || 0,
        billingDayOfMonth: clampDay(day)
      }), {
        successMessage: "Updated",
        errorMessage: "Could not update",
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
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
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
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
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3" colSpan={4}>
        <form onSubmit={save} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="Name" className="md:col-span-5">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Amount" className="md:col-span-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Billing day" className="md:col-span-2">
            <Input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          <Field label={"\u00A0"} className="md:col-span-2">
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving} className="w-full">
                {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="px-2">
                Cancel
              </Button>
            </div>
          </Field>
        </form>
      </td>
    </tr>
  );
}

function SubscriptionRow({ recurring, user, run }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(recurring.name);
  const [amount, setAmount] = useState(recurring.amount ?? "");
  const [interval, setInterval] = useState(recurring.interval ?? "yearly");
  const [customMonths, setCustomMonths] = useState(recurring.customMonths ?? "2");
  const [startDate, setStartDate] = useState(recurring.startDate ?? "");
  const [saving, setSaving] = useState(false);

  const daysUntil = getDaysUntil(recurring.nextRenewal);
  
  function getIntervalLabel() {
    if (recurring.interval === "custom") return `Every ${recurring.customMonths} mo`;
    const intervalObj = INTERVALS.find(i => i.value === recurring.interval);
    return intervalObj ? intervalObj.label : recurring.interval;
  }

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      await run(() => updateRecurring(user.uid, recurring.id, {
        name: name.trim() || recurring.name,
        amount: Number(amount) || 0,
        interval,
        startDate,
        customMonths: interval === "custom" ? Number(customMonths) : null
      }), {
        successMessage: "Updated",
        errorMessage: "Could not update",
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
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
            <span className="text-neutral-100">{formatDateEST(recurring.nextRenewal)}</span>
            {daysUntil !== null && (
              <span className={`text-xs ${daysUntil <= 7 ? "text-amber-400" : "text-neutral-500"}`}>
                {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
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
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3" colSpan={5}>
        <form onSubmit={save} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="Name" className="md:col-span-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Amount" className="md:col-span-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Interval" className="md:col-span-2">
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {INTERVALS.map((int) => (
                <option key={int.value} value={int.value}>
                  {int.label}
                </option>
              ))}
            </select>
          </Field>
          
          {interval === "custom" ? (
            <>
              <Field label="Start date" className="md:col-span-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="Every X mo" className="md:col-span-1">
                <Input
                  type="number"
                  min="1"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(e.target.value)}
                />
              </Field>
              <Field label={"\u00A0"} className="md:col-span-2">
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving} className="w-full">
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="px-2">
                    Cancel
                  </Button>
                </div>
              </Field>
            </>
          ) : (
            <>
              <Field label="Start date" className="md:col-span-3">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label={"\u00A0"} className="md:col-span-2">
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving} className="w-full">
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="px-2">
                    Cancel
                  </Button>
                </div>
              </Field>
            </>
          )}
        </form>
      </td>
    </tr>
  );
}