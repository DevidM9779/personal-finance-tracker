import { useMemo, useState } from "react";
import { Trash2, Plus, Loader2, PencilLine, CreditCard } from "lucide-react";
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
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_MAP,
  TRANSACTION_TYPES,
  categoryLabel,
} from "../lib/categories";
import { formatCurrency, formatDate, todayIsoDate } from "../lib/format";
import { useToast, useToastedAction } from "../components/toastHooks";
import {
  createTransaction,
  deleteTransaction,
  updateAccount,
} from "../lib/firestoreData";

const EMPTY_ROW = () => ({
  key: Math.random().toString(36).slice(2),
  date: todayIsoDate(),
  type: "expense",
  amount: "",
  category: "groceries",
  subCategory: "",
  accountId: "",
  note: "",
});

export default function WeeklyEntry({ user, accounts, transactions }) {
  const { toast } = useToast();
  const run = useToastedAction();
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [submitting, setSubmitting] = useState(false);

  const bankAndCreditAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.isActive !== false &&
          (a.type === "bank" ||
            a.type === "creditCard" ||
            a.type === "asset")
      ),
    [accounts]
  );

  const creditCards = useMemo(
    () => accounts.filter((a) => a.type === "creditCard" && a.isActive !== false),
    [accounts]
  );

  function updateRow(key, patch) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              ...patch,
              ...("category" in patch ? { subCategory: "" } : {}),
            }
          : r
      )
    );
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()]);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length === 1 ? [EMPTY_ROW()] : prev.filter((r) => r.key !== key)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;

    const cleaned = rows
      .map((r) => ({
        ...r,
        amount: Number(r.amount),
      }))
      .filter((r) => Number.isFinite(r.amount) && r.amount > 0);

    if (cleaned.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Add at least one row with an amount.",
        variant: "info",
      });
      return;
    }

    setSubmitting(true);
    try {
      for (const r of cleaned) {
        await createTransaction(user.uid, {
          date: r.date,
          amount: r.amount,
          type: r.type,
          category: r.type === "expense" ? r.category : null,
          subCategory: r.type === "expense" ? r.subCategory || null : null,
          accountId: r.accountId || null,
          note: r.note || null,
        });
      }
      toast({
        title: `Saved ${cleaned.length} transaction${cleaned.length === 1 ? "" : "s"}`,
        variant: "success",
      });
      setRows([EMPTY_ROW()]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not save transactions",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Weekly entry
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
          Log this week's activity
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Capture expenses, income, and asset contributions, then update the
          current balances on your credit cards.
        </p>
      </header>

      <Card>
        <CardHeader
          title="New transactions"
          subtitle="Add multiple rows to log a whole week quickly"
        />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <EntryRow
                  key={row.key}
                  row={row}
                  index={idx}
                  accounts={bankAndCreditAccounts}
                  onChange={(patch) => updateRow(row.key, patch)}
                  onRemove={() => removeRow(row.key)}
                  canRemove={rows.length > 1}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={addRow}>
                <Plus size={14} />
                Add another
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving
                  </>
                ) : (
                  <>
                    <PencilLine size={14} /> Save transactions
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Update credit card balances"
          subtitle="Snapshot the latest current and statement balances per card"
        />
        <CardBody>
          {creditCards.length === 0 ? (
            <Empty
              icon={CreditCard}
              title="No credit cards yet"
              hint="Add a credit card under the Accounts page to enable forecasting."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {creditCards.map((card) => (
                <CreditCardBalanceCard
                  key={card.id}
                  card={card}
                  onSave={async (patch) => {
                    await run(() => updateAccount(user.uid, card.id, patch), {
                      successMessage: `${card.name} balances updated`,
                      errorMessage: "Could not update balances",
                    });
                  }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recent entries"
          subtitle={`${transactions.length} total`}
        />
        <CardBody>
          {transactions.length === 0 ? (
            <Empty
              icon={PencilLine}
              title="Nothing logged yet"
              hint="Save your first transaction above."
            />
          ) : (
            <ul className="divide-y divide-neutral-900">
              {transactions.slice(0, 25).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-200">
                      {t.note || categoryLabel(t.category, t.subCategory)}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {formatDate(t.date)} ·{" "}
                      <span className="capitalize">
                        {t.type === "assetContribution"
                          ? "asset contribution"
                          : t.type}
                      </span>
                      {t.type === "expense" ? ` · ${categoryLabel(t.category, t.subCategory)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`tabular text-sm font-medium ${
                        t.type === "expense"
                          ? "text-rose-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {t.type === "expense" ? "−" : "+"}
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300"
                      onClick={() =>
                        run(() => deleteTransaction(user.uid, t.id), {
                          successMessage: "Transaction removed",
                          errorMessage: "Could not delete",
                        })
                      }
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function EntryRow({ row, index, accounts, onChange, onRemove, canRemove }) {
  const isExpense = row.type === "expense";
  const category = EXPENSE_CATEGORY_MAP[row.category];
  const hasSubTags = isExpense && category?.subTags?.length;

  return (
    <div className="grid grid-cols-12 gap-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="col-span-12 md:col-span-2">
        <Field label={index === 0 ? "Date" : undefined}>
          <Input
            type="date"
            value={row.date}
            onChange={(e) => onChange({ date: e.target.value })}
            required
          />
        </Field>
      </div>
      <div className="col-span-6 md:col-span-2">
        <Field label={index === 0 ? "Type" : undefined}>
          <Select
            value={row.type}
            onChange={(e) => onChange({ type: e.target.value })}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="col-span-6 md:col-span-2">
        <Field label={index === 0 ? "Amount" : undefined}>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
        </Field>
      </div>
      <div className={`col-span-12 md:col-span-${hasSubTags ? "2" : "3"}`}>
        <Field label={index === 0 ? (isExpense ? "Category" : "Account") : undefined}>
          {isExpense ? (
            <Select
              value={row.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              value={row.accountId}
              onChange={(e) => onChange({ accountId: e.target.value })}
            >
              <option value="">— Select account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {hasSubTags ? (
        <div className="col-span-12 md:col-span-2">
          <Field label={index === 0 ? "Sub-tag" : undefined}>
            <Select
              value={row.subCategory}
              onChange={(e) => onChange({ subCategory: e.target.value })}
            >
              <option value="">— Optional —</option>
              {category.subTags.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}
      <div className="col-span-11 md:col-span-3">
        <Field label={index === 0 ? "Note" : undefined}>
          <Input
            type="text"
            value={row.note}
            placeholder={isExpense ? "Optional note" : "Optional source / note"}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </Field>
      </div>
      <div className="col-span-1 flex items-end justify-end">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-900 hover:text-rose-300 disabled:opacity-30"
          aria-label="Remove row"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CreditCardBalanceCard({ card, onSave }) {
  const [current, setCurrent] = useState(card.currentBalance ?? "");
  const [statement, setStatement] = useState(card.lastStatementBalance ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        currentBalance: Number(current) || 0,
        lastStatementBalance: Number(statement) || 0,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-100">{card.name}</p>
          <p className="text-[11px] text-neutral-500">
            Closes {card.statementClosingDay ? `on the ${card.statementClosingDay}th` : "—"} · Due{" "}
            {card.paymentDueDay ? `on the ${card.paymentDueDay}th` : "—"}
          </p>
        </div>
        <Badge tone="negative">{formatCurrency(card.currentBalance)}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Current balance">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="Last statement balance">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Update
        </Button>
      </div>
    </form>
  );
}
