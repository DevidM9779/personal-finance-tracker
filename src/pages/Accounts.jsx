import { useState } from "react";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Field,
  Input,
  Select,
} from "../components/ui";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL } from "../lib/categories";
import { formatCurrency, ordinal } from "../lib/format";
import { useToast, useToastedAction } from "../components/toastHooks";
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "../lib/firestoreData";

const EMPTY_FORM = {
  name: "",
  type: "bank",
  balance: "",
  currentBalance: "",
  lastStatementBalance: "",
  statementClosingDay: "",
  paymentDueDay: "",
};

export default function Accounts({ user, accounts }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const run = useToastedAction();

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

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
      const base = { name, type: form.type, isActive: true };
      const payload =
        form.type === "creditCard"
          ? {
              ...base,
              currentBalance: Number(form.currentBalance) || 0,
              lastStatementBalance: Number(form.lastStatementBalance) || 0,
              statementClosingDay: clampDay(form.statementClosingDay),
              paymentDueDay: clampDay(form.paymentDueDay),
            }
          : {
              ...base,
              balance: Number(form.balance) || 0,
            };
      await createAccount(user.uid, payload);
      toast({ title: `${name} added`, variant: "success" });
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not create account",
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
          Accounts
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Bank, asset, and credit card accounts
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Track the building blocks of your net worth. Credit cards capture
          statement and due dates for forecasting.
        </p>
      </header>

      <Card>
        <CardHeader title="Add account" />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Field label="Name" className="md:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Chase Checking, Roth IRA, Amex Gold..."
              />
            </Field>
            <Field label="Type" className="md:col-span-2">
              <Select
                value={form.type}
                onChange={(e) => update({ type: e.target.value })}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            {form.type === "creditCard" ? (
              <>
                <Field label="Current balance">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentBalance}
                    onChange={(e) => update({ currentBalance: e.target.value })}
                  />
                </Field>
                <Field label="Statement balance" className="md:col-span-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.lastStatementBalance}
                    onChange={(e) =>
                      update({ lastStatementBalance: e.target.value })
                    }
                  />
                </Field>
                <Field label="Closing day">
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.statementClosingDay}
                    onChange={(e) =>
                      update({ statementClosingDay: e.target.value })
                    }
                  />
                </Field>
                <Field label="Due day">
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.paymentDueDay}
                    onChange={(e) => update({ paymentDueDay: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <Field label="Balance" className="md:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => update({ balance: e.target.value })}
                />
              </Field>
            )}
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add account
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {ACCOUNT_TYPES.map((t) => {
        const list = accounts.filter((a) => a.type === t.id);
        return (
          <Card key={t.id}>
            <CardHeader
              title={ACCOUNT_TYPE_LABEL[t.id]}
              action={
                <Badge>
                  {list.length} · {formatCurrency(
                    list.reduce(
                      (s, a) =>
                        s +
                        Number(
                          t.id === "creditCard" ? a.currentBalance : a.balance
                        ),
                      0
                    )
                  )}
                </Badge>
              }
            />
            <CardBody>
              {list.length === 0 ? (
                <Empty
                  icon={Wallet}
                  title="No accounts in this group"
                  hint="Add one using the form above."
                />
              ) : (
                <div className="space-y-3">
                  {list.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onSave={(patch) =>
                        run(() => updateAccount(user.uid, account.id, patch), {
                          successMessage: `${account.name} updated`,
                          errorMessage: "Could not update account",
                        })
                      }
                      onDelete={() =>
                        run(() => deleteAccount(user.uid, account.id), {
                          successMessage: `${account.name} removed`,
                          errorMessage: "Could not delete account",
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function AccountRow({ account, onSave, onDelete }) {
  const isCard = account.type === "creditCard";
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(account.balance ?? "");
  const [currentBalance, setCurrentBalance] = useState(account.currentBalance ?? "");
  const [lastStatementBalance, setLastStatementBalance] = useState(
    account.lastStatementBalance ?? ""
  );
  const [closingDay, setClosingDay] = useState(account.statementClosingDay ?? "");
  const [dueDay, setDueDay] = useState(account.paymentDueDay ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = isCard
        ? {
            name: name.trim() || account.name,
            currentBalance: Number(currentBalance) || 0,
            lastStatementBalance: Number(lastStatementBalance) || 0,
            statementClosingDay: clampDay(closingDay),
            paymentDueDay: clampDay(dueDay),
          }
        : {
            name: name.trim() || account.name,
            balance: Number(balance) || 0,
          };
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Name" className="min-w-[180px] flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {isCard ? (
          <>
            <Field label="Current">
              <Input
                type="number"
                step="0.01"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
              />
            </Field>
            <Field label="Statement">
              <Input
                type="number"
                step="0.01"
                value={lastStatementBalance}
                onChange={(e) => setLastStatementBalance(e.target.value)}
              />
            </Field>
            <Field label="Closing day" className="w-24">
              <Input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </Field>
            <Field label="Due day" className="w-24">
              <Input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field label="Balance">
            <Input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </Field>
        )}
        <div className="flex shrink-0 gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </Button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete ${account.name}?`)) onDelete();
            }}
            className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300"
            aria-label="Delete account"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {isCard ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
          <span>Closes {closingDay ? `on the ${ordinal(closingDay)}` : "—"}</span>
          <span>·</span>
          <span>Due {dueDay ? `on the ${ordinal(dueDay)}` : "—"}</span>
        </div>
      ) : null}
    </form>
  );
}

function clampDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(1, Math.round(n)), 31);
}
