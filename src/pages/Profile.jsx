import { useMemo, useState } from "react";
import { Loader2, Save, User, Plus, X } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
} from "../components/ui";
import { formatCurrency, ordinal } from "../lib/format";
import { useToast } from "../components/toastHooks";
import { updateProfile } from "../lib/firestoreData";
import { EXPENSE_CATEGORIES, categoryLabel } from "../lib/categories";

export default function Profile({ user, profile }) {
  const { toast } = useToast();
  const profileKey = useMemo(
    () => `${profile?.id || ""}:${profile?.expectedMonthlyIncome ?? ""}:${profile?.preferredDebtPaymentDayOfMonth ?? ""}:${profile?.impulseThreshold ?? ""}:${JSON.stringify(profile?.impulseCategories ?? [])}`,
    [profile]
  );
  const [formState, setFormState] = useState(() => ({
    key: profileKey,
    expectedMonthlyIncome: profile?.expectedMonthlyIncome ?? 0,
    preferredDebtPaymentDayOfMonth: profile?.preferredDebtPaymentDayOfMonth ?? 1,
    impulseThreshold: profile?.impulseThreshold ?? 200,
    impulseCategories: profile?.impulseCategories ?? ["misc", "restaurants_dates"],
    weeklyBudgets: profile?.weeklyBudgets ?? {},
  }));

  // When the underlying profile snapshot changes, sync derived state without
  // an effect (recommended by React's docs for derived state from props).
  if (formState.key !== profileKey) {
    setFormState({
      key: profileKey,
      expectedMonthlyIncome: profile?.expectedMonthlyIncome ?? 0,
      preferredDebtPaymentDayOfMonth: profile?.preferredDebtPaymentDayOfMonth ?? 1,
      impulseThreshold: profile?.impulseThreshold ?? 200,
      impulseCategories: profile?.impulseCategories ?? ["misc", "restaurants_dates"],
    });
  }

  const expectedMonthlyIncome = formState.expectedMonthlyIncome;
  const preferredDebtPaymentDayOfMonth = formState.preferredDebtPaymentDayOfMonth;
  const impulseThreshold = formState.impulseThreshold;
  const impulseCategories = formState.impulseCategories;
  const setExpectedMonthlyIncome = (v) =>
    setFormState((s) => ({ ...s, expectedMonthlyIncome: v }));
  const setPreferredDebtPaymentDayOfMonth = (v) =>
    setFormState((s) => ({ ...s, preferredDebtPaymentDayOfMonth: v }));
  const setImpulseThreshold = (v) =>
    setFormState((s) => ({ ...s, impulseThreshold: v }));
  const toggleImpulseCategory = (categoryId) => {
    setFormState((s) => ({
      ...s,
      impulseCategories: s.impulseCategories.includes(categoryId)
        ? s.impulseCategories.filter((c) => c !== categoryId)
        : [...s.impulseCategories, categoryId],
    }));
  };
  const [saving, setSaving] = useState(false);
  const updateWeeklyBudget = (categoryId, amount) => {
  setFormState((s) => ({
    ...s,
    weeklyBudgets: { ...s.weeklyBudgets, [categoryId]: amount },
  }));
};

  async function onSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.uid, {
        expectedMonthlyIncome: Number(expectedMonthlyIncome) || 0,
        preferredDebtPaymentDayOfMonth: clampDay(
          preferredDebtPaymentDayOfMonth
        ),
        impulseThreshold: Number(impulseThreshold) || 200,
        impulseCategories: impulseCategories,
        weeklyBudgets: formState.weeklyBudgets,
      });
      toast({ title: "Profile saved", variant: "success" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not save profile",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Profile
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Preferences
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          These values power the dashboard's forecasting and liquidity alerts.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Account"
          action={
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              <User size={12} />
              {user?.email}
            </span>
          }
        />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Expected monthly income"
              hint={`Currently ${formatCurrency(profile?.expectedMonthlyIncome || 0)}`}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                value={expectedMonthlyIncome}
                onChange={(e) => setExpectedMonthlyIncome(e.target.value)}
              />
            </Field>
            <Field
              label="Preferred debt payment day"
              hint={`The day each month you pay all your credit cards (currently ${ordinal(profile?.preferredDebtPaymentDayOfMonth || 1)}).`}
            >
              <Input
                type="number"
                min="1"
                max="31"
                value={preferredDebtPaymentDayOfMonth}
                onChange={(e) =>
                  setPreferredDebtPaymentDayOfMonth(e.target.value)
                }
              />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save profile
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Impulse Spending Tracking" />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Monthly impulse threshold"
              hint={`Maximum monthly spending for impulse categories (currently ${formatCurrency(profile?.impulseThreshold || 200)})`}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                value={impulseThreshold}
                onChange={(e) => setImpulseThreshold(e.target.value)}
              />
            </Field>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Impulse categories
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select categories to track as impulse spending
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleImpulseCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                      impulseCategories.includes(cat.id)
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    {impulseCategories.includes(cat.id) && <Plus size={12} />}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save settings
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader title="Weekly Category Budgets" />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <Field key={cat.id} label={`${cat.label} Budget`}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.weeklyBudgets[cat.id] || ""}
                  onChange={(e) => updateWeeklyBudget(cat.id, e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            ))}
            <div className="md:col-span-2 flex justify-end mt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save budgets
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), 31);
}
