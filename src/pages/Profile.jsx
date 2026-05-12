import { useMemo, useState } from "react";
import { Loader2, Save, User } from "lucide-react";
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

export default function Profile({ user, profile }) {
  const { toast } = useToast();
  const profileKey = useMemo(
    () => `${profile?.id || ""}:${profile?.expectedMonthlyIncome ?? ""}:${profile?.preferredDebtPaymentDayOfMonth ?? ""}`,
    [profile]
  );
  const [formState, setFormState] = useState(() => ({
    key: profileKey,
    expectedMonthlyIncome: profile?.expectedMonthlyIncome ?? 0,
    preferredDebtPaymentDayOfMonth: profile?.preferredDebtPaymentDayOfMonth ?? 1,
  }));

  // When the underlying profile snapshot changes, sync derived state without
  // an effect (recommended by React's docs for derived state from props).
  if (formState.key !== profileKey) {
    setFormState({
      key: profileKey,
      expectedMonthlyIncome: profile?.expectedMonthlyIncome ?? 0,
      preferredDebtPaymentDayOfMonth: profile?.preferredDebtPaymentDayOfMonth ?? 1,
    });
  }

  const expectedMonthlyIncome = formState.expectedMonthlyIncome;
  const preferredDebtPaymentDayOfMonth = formState.preferredDebtPaymentDayOfMonth;
  const setExpectedMonthlyIncome = (v) =>
    setFormState((s) => ({ ...s, expectedMonthlyIncome: v }));
  const setPreferredDebtPaymentDayOfMonth = (v) =>
    setFormState((s) => ({ ...s, preferredDebtPaymentDayOfMonth: v }));
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), 31);
}
