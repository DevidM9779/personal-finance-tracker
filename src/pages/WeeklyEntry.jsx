import { useMemo, useState } from "react";
import { Trash2, Plus, Loader2, PencilLine, CreditCard, Filter, X } from "lucide-react";
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
  updateTransaction,
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Sort by date descending (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Apply time filter
    const now = new Date();
    if (customStartDate && customEndDate) {
      // Use custom date range
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= start && transactionDate <= end;
      });
    } else if (timeFilter !== "all") {
      const startDate = new Date();
      if (timeFilter === "week") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeFilter === "month") {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeFilter === "quarter") {
        startDate.setMonth(now.getMonth() - 3);
      } else if (timeFilter === "year") {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    return filtered;
  }, [transactions, categoryFilter, timeFilter, typeFilter, customStartDate, customEndDate]);

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

  function startEdit(transaction) {
    setEditingTransaction(transaction);
    setEditForm({
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category || '',
      subCategory: transaction.subCategory || '',
      accountId: transaction.accountId || '',
      note: transaction.note || '',
    });
  }

  function cancelEdit() {
    setEditingTransaction(null);
    setEditForm({});
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!user || !editingTransaction) return;

    setSubmitting(true);
    try {
      await updateTransaction(user.uid, editingTransaction.id, {
        date: editForm.date,
        amount: Number(editForm.amount),
        type: editForm.type,
        category: editForm.type === 'expense' ? editForm.category : null,
        subCategory: editForm.type === 'expense' ? editForm.subCategory || null : null,
        accountId: editForm.accountId || null,
        note: editForm.note || null,
      });
      toast({
        title: "Transaction updated",
        variant: "success",
      });
      cancelEdit();
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not update transaction",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
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
          subtitle={`${filteredTransactions.length} shown${categoryFilter !== "all" || timeFilter !== "all" || typeFilter !== "all" || customStartDate || customEndDate ? ` (filtered from ${transactions.length} total)` : ""}`}
        />
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-neutral-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All types</option>
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All time</option>
                <option value="week">Last week</option>
                <option value="month">Last month</option>
                <option value="quarter">Last 3 months</option>
                <option value="year">Last year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            {timeFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-neutral-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
            {(categoryFilter !== "all" || timeFilter !== "all" || typeFilter !== "all" || customStartDate || customEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter("all");
                  setTimeFilter("all");
                  setTypeFilter("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="h-7 text-xs"
              >
                <X size={12} />
                Clear
              </Button>
            )}
          </div>
          {filteredTransactions.length === 0 ? (
            <Empty
              icon={PencilLine}
              title={categoryFilter !== "all" || timeFilter !== "all" || typeFilter !== "all" || customStartDate || customEndDate ? "No matching entries" : "Nothing logged yet"}
              hint={categoryFilter !== "all" || timeFilter !== "all" || typeFilter !== "all" || customStartDate || customEndDate ? "Try adjusting your filters." : "Save your first transaction above."}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-neutral-900">
                {filteredTransactions.map((t) => (
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
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-900 hover:text-emerald-300"
                          onClick={() => startEdit(t)}
                          title="Edit transaction"
                        >
                          <PencilLine size={14} />
                        </button>
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
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader title="Edit Transaction" />
            <CardBody>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <Field label="Date">
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Type">
                  <Select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value, category: '', subCategory: '' })}
                    required
                  >
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                  />
                </Field>
                {editForm.type === 'expense' && (
                  <>
                    <Field label="Category">
                      <Select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value, subCategory: '' })}
                        required
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {editForm.category && EXPENSE_CATEGORY_MAP[editForm.category]?.subTags?.length > 0 && (
                      <Field label="Sub-category">
                        <Select
                          value={editForm.subCategory}
                          onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })}
                        >
                          <option value="">None</option>
                          {EXPENSE_CATEGORY_MAP[editForm.category].subTags.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </>                
                )}
                <Field label="Account">
                  <Select
                    value={editForm.accountId}
                    onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}
                  >
                    <option value="">None</option>
                    {bankAndCreditAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note">
                  <Input
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelEdit}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
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
