import { useState } from "react";
import { Loader2, Plus, Repeat, Trash2 } from "lucide-react";
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

const EMPTY_FORM = { name: "", amount: "", billingDayOfMonth: "1" };

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
        billingDayOfMonth: clampDay(form.billingDayOfMonth),
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

  const sorted = [...recurring].sort(
    (a, b) => Number(a.billingDayOfMonth) - Number(b.billingDayOfMonth)
  );
  const total = sorted.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Recurring expenses
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Fixed monthly bills
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          These bills are factored into the Debt Anticipation Engine alongside
          your credit card statement balances.
        </p>
      </header>

      <Card>
        <CardHeader title="Add recurring expense" />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
            <Field label="Billing day" hint="Day of month (1–31)">
              <Input
                type="number"
                min="1"
                max="31"
                value={form.billingDayOfMonth}
                onChange={(e) =>
                  setForm({ ...form, billingDayOfMonth: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Monthly recurring"
          subtitle={`${sorted.length} bill${sorted.length === 1 ? "" : "s"} · sorted by billing day`}
          action={<Badge tone="warning">{formatCurrency(total)} / mo</Badge>}
        />
        <CardBody>
          {sorted.length === 0 ? (
            <Empty
              icon={Repeat}
              title="No recurring expenses"
              hint="Add fixed costs to enable accurate forecasting."
            />
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
                  {sorted.map((r) => (
                    <RecurringRow
                      key={r.id}
                      recurring={r}
                      onSave={(patch) =>
                        run(() => updateRecurring(user.uid, r.id, patch), {
                          successMessage: `${r.name} updated`,
                          errorMessage: "Could not update",
                        })
                      }
                      onDelete={() =>
                        run(() => deleteRecurring(user.uid, r.id), {
                          successMessage: `${r.name} removed`,
                          errorMessage: "Could not delete",
                        })
                      }
                    />
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

function RecurringRow({ recurring, onSave, onDelete }) {
  const [name, setName] = useState(recurring.name);
  const [amount, setAmount] = useState(recurring.amount ?? "");
  const [day, setDay] = useState(recurring.billingDayOfMonth ?? 1);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || recurring.name,
        amount: Number(amount) || 0,
        billingDayOfMonth: clampDay(day),
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
                if (window.confirm(`Delete ${recurring.name}?`)) onDelete();
              }}
              className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300"
              aria-label="Delete recurring expense"
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
        <form onSubmit={save} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Field label="Name" className="md:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Billing day">
            <Input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), 31);
}
