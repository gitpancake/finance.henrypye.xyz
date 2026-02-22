"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column, type UserOption } from "@/components/EditableTable";
import SummaryCard from "@/components/SummaryCard";
import { formatMoney, formatPercent } from "@/lib/format";
import { calculateTax } from "@/lib/tax";
import type { Currency, BudgetLineItem } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";
import { yearlyAmount } from "@/lib/subscriptions";

const expenseColumns: Column[] = [
  { key: "label", label: "Item", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "accountId", label: "Account", type: "user-select" },
  { key: "dayOfMonth", label: "Day", type: "number", width: "70px" },
  { key: "recurring", label: "Recurring", type: "checkbox", width: "80px" },
];

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BudgetPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();
  const [month, setMonth] = useState(getCurrentMonth);

  const accountOptions: UserOption[] = state.accounts.map((a) => ({ value: a.id, label: a.name }));

  const budget = state.budgets.find((b) => b.month === month);

  // Income is stored as a single line item with label "Annual Income"
  const incomeItem = budget?.lineItems.find((li) => li.category === "income");
  const [incomeInput, setIncomeInput] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState<Currency>("CAD");
  const [incomeInitialized, setIncomeInitialized] = useState<string | null>(null);

  // Sync local input state when month changes or data loads
  if (incomeInitialized !== month && isLoaded) {
    const existing = state.budgets
      .find((b) => b.month === month)
      ?.lineItems.find((li) => li.category === "income");
    setIncomeInput(existing ? String(existing.amount) : "");
    setIncomeCurrency(existing?.currency ?? "CAD");
    setIncomeInitialized(month);
  }

  const annualIncome = parseFloat(incomeInput) || 0;
  const expenseItems = budget?.lineItems.filter((li) => li.category === "expense") ?? [];

  const isCurrentMonth = month === getCurrentMonth();
  const today = new Date().getDate();

  const remaining = useMemo(() => {
    if (!isCurrentMonth) return { items: [], byAccount: [] };

    const items = expenseItems.filter(
      (li) => li.dayOfMonth !== null && li.dayOfMonth > today
    );

    // Group by accountId
    const accountMap = new Map<string | null, { items: BudgetLineItem[]; total: number }>();
    for (const item of items) {
      const key = item.accountId;
      const entry = accountMap.get(key) || { items: [], total: 0 };
      entry.items.push(item);
      entry.total += convert(item.amount, item.currency);
      accountMap.set(key, entry);
    }

    const byAccount = Array.from(accountMap.entries()).map(([accountId, data]) => {
      const account = accountId ? state.accounts.find((a) => a.id === accountId) : null;
      const accountBalance = account ? convert(account.balance, account.currency) : null;
      const deficit = accountBalance !== null ? data.total - accountBalance : null;
      return {
        accountId,
        accountName: account?.name ?? "Unassigned",
        accountCurrency: account?.currency ?? null,
        accountBalance,
        remaining: data.total,
        deficit,
        items: data.items,
      };
    });

    return { items, byAccount };
  }, [isCurrentMonth, expenseItems, today, state.accounts, convert]);

  const saveIncome = () => {
    if (incomeItem) {
      // Update existing
      dispatch({
        type: "UPDATE_BUDGET_ITEM",
        payload: {
          month,
          item: {
            ...incomeItem,
            amount: annualIncome,
            currency: incomeCurrency,
            label: "Annual Income",
          },
        },
      });
    } else if (annualIncome > 0) {
      // Create new
      dispatch({
        type: "ADD_BUDGET_ITEM",
        payload: {
          month,
          item: {
            id: crypto.randomUUID(),
            label: "Annual Income",
            amount: annualIncome,
            currency: incomeCurrency,
            category: "income",
            dayOfMonth: null,
            recurring: true,
            accountId: null,
            sortOrder: 0,
          },
        },
      });
    }
  };

  const totals = useMemo(() => {
    const annualGrossCAD = convert(annualIncome, incomeCurrency, "CAD");
    const tax = calculateTax(annualGrossCAD);

    const annualGrossDisplay = convert(annualIncome, incomeCurrency);
    const monthlyGross = convert(annualIncome / 12, incomeCurrency);
    const monthlyNet = convert(tax.monthlyNet, "CAD");
    const annualNet = convert(tax.netIncome, "CAD");

    const expenses = expenseItems.reduce(
      (sum, li) => sum + convert(li.amount, li.currency),
      0
    );

    const annualSubsMonthly = state.annualSubscriptions.reduce(
      (sum, s) => sum + convert(yearlyAmount(s) / 12, s.currency),
      0
    );

    const totalMonthlyOut = expenses + annualSubsMonthly;

    return {
      annualGross: annualGrossDisplay,
      monthlyGross,
      annualNet,
      monthlyNet,
      tax,
      expenses,
      annualSubsMonthly,
      totalMonthlyOut,
      net: monthlyNet - totalMonthlyOut,
    };
  }, [annualIncome, incomeCurrency, expenseItems, state.annualSubscriptions, convert]);

  const handleAddExpense = (row: Record<string, unknown>) => {
    const day = Number(row.dayOfMonth) || 0;
    const item: BudgetLineItem = {
      id: crypto.randomUUID(),
      label: String(row.label || ""),
      amount: Number(row.amount) || 0,
      currency: (row.currency as Currency) || "CAD",
      category: "expense",
      dayOfMonth: day >= 1 && day <= 31 ? day : null,
      recurring: row.recurring !== false,
      accountId: (row.accountId as string) || null,
      sortOrder: Math.max(0, ...expenseItems.map((li) => li.sortOrder)) + 1,
    };
    dispatch({ type: "ADD_BUDGET_ITEM", payload: { month, item } });
  };

  const handleUpdateExpense = (row: Record<string, unknown>) => {
    const existing = expenseItems.find((li) => li.id === row.id);
    const day = Number(row.dayOfMonth) || 0;
    const item: BudgetLineItem = {
      id: row.id as string,
      label: String(row.label || ""),
      amount: Number(row.amount) || 0,
      currency: (row.currency as Currency) || "CAD",
      category: "expense",
      dayOfMonth: day >= 1 && day <= 31 ? day : null,
      recurring: row.recurring !== false,
      accountId: (row.accountId as string) || null,
      sortOrder: existing?.sortOrder ?? 0,
    };
    dispatch({ type: "UPDATE_BUDGET_ITEM", payload: { month, item } });
  };

  const handleDelete = (itemId: string) => {
    dispatch({ type: "DELETE_BUDGET_ITEM", payload: { month, itemId } });
  };

  const handleCopyToNext = () => {
    const nextMonth = shiftMonth(month, 1);
    const existing = state.budgets.find((b) => b.month === nextMonth);
    if (existing && existing.lineItems.length > 0) {
      if (!window.confirm(`${formatMonth(nextMonth)} already has entries. Overwrite?`)) {
        return;
      }
    }
    const items = (budget?.lineItems ?? []).map((li) => ({
      ...li,
      id: crypto.randomUUID(),
    }));
    dispatch({
      type: "SET_BUDGET",
      payload: { month: nextMonth, lineItems: items },
    });
  };

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Monthly Budget</h1>

      {/* Month selector */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="text-sm text-zinc-400 hover:text-zinc-900"
        >
          &larr; Prev
        </button>
        <span className="text-sm font-medium text-zinc-700 w-40 text-center">
          {formatMonth(month)}
        </span>
        <button
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="text-sm text-zinc-400 hover:text-zinc-900"
        >
          Next &rarr;
        </button>
      </div>

      {/* Annual Income */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-700 mb-2">Annual Income</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <input
              type="number"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              onBlur={saveIncome}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveIncome();
              }}
              className="w-full rounded border border-zinc-200 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <select
            value={incomeCurrency}
            onChange={(e) => {
              setIncomeCurrency(e.target.value as Currency);
              // Save on currency change too
              setTimeout(saveIncome, 0);
            }}
            className="rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {annualIncome > 0 && (
            <span className="text-xs text-zinc-400 pb-2">
              {formatMoney(annualIncome / 12, incomeCurrency)}/mo
            </span>
          )}
        </div>
      </div>

      <EditableTable
        title="Monthly Expenses"
        columns={expenseColumns}
        rows={expenseItems}
        onAdd={handleAddExpense}
        onUpdate={handleUpdateExpense}
        onDelete={handleDelete}
        defaultValues={{ currency: "CAD", recurring: true, accountId: null }}
        usersData={accountOptions}
        onReorder={(ids) => dispatch({ type: "REORDER_BUDGET_ITEMS", payload: { month, orderedIds: ids } })}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          label="Annual Gross"
          value={totals.annualGross}
          currency={displayCurrency}
          colorOverride="text-zinc-700"
        />
        <SummaryCard
          label="Annual After Tax"
          value={totals.annualNet}
          currency={displayCurrency}
          subtitle={annualIncome > 0 ? `${formatPercent(totals.tax.effectiveRate)} effective` : undefined}
        />
        <SummaryCard
          label="Monthly After Tax"
          value={totals.monthlyNet}
          currency={displayCurrency}
        />
        <SummaryCard
          label="Monthly Expenses"
          value={-totals.expenses}
          currency={displayCurrency}
          subtitle={totals.annualSubsMonthly > 0 ? `+ ${formatMoney(totals.annualSubsMonthly, displayCurrency)} subs` : undefined}
        />
        <SummaryCard
          label="Total Outgoings"
          value={-totals.totalMonthlyOut}
          currency={displayCurrency}
        />
        <SummaryCard
          label="Monthly Remaining"
          value={totals.net}
          currency={displayCurrency}
        />
      </div>

      {isCurrentMonth && remaining.items.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Remaining This Month
          </div>
          <div className="text-xs text-zinc-400 mb-3">
            {remaining.items.length} expense{remaining.items.length !== 1 && "s"} still to come (day {today + 1}–31)
          </div>

          {remaining.byAccount.map((group) => {
            const afterExpenses = group.accountBalance !== null
              ? group.accountBalance - group.remaining
              : null;
            return (
              <div key={group.accountId ?? "unassigned"} className="mb-5 last:mb-0">
                <div className="text-sm font-medium text-zinc-700 mb-2">{group.accountName}</div>

                {group.accountBalance !== null && (
                  <div className="grid grid-cols-3 gap-4 mb-3 rounded bg-zinc-50 px-3 py-2">
                    <div>
                      <div className="text-xs text-zinc-400">Current Balance</div>
                      <div className="font-mono text-sm font-semibold text-zinc-900">
                        {formatMoney(group.accountBalance, displayCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Still to Come</div>
                      <div className="font-mono text-sm font-semibold text-zinc-700">
                        -{formatMoney(group.remaining, displayCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">After Expenses</div>
                      <div className={`font-mono text-sm font-semibold ${afterExpenses !== null && afterExpenses < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatMoney(afterExpenses ?? 0, displayCurrency)}
                      </div>
                      {afterExpenses !== null && afterExpenses < 0 && (
                        <div className="text-xs font-medium text-red-600 mt-0.5">
                          Top up {formatMoney(Math.abs(afterExpenses), displayCurrency)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {group.items
                    .sort((a, b) => (a.dayOfMonth ?? 0) - (b.dayOfMonth ?? 0))
                    .map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-700">{item.label}</span>
                          <span className="text-xs text-zinc-400">
                            Day {item.dayOfMonth}
                          </span>
                        </div>
                        <span className="font-mono text-zinc-700">
                          {formatMoney(convert(item.amount, item.currency), displayCurrency)}
                        </span>
                      </div>
                    ))}
                </div>

                {group.accountBalance !== null && (
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        afterExpenses !== null && afterExpenses < 0
                          ? "bg-red-400"
                          : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (group.remaining / group.accountBalance) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {budget && budget.lineItems.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCopyToNext}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900 border border-zinc-200 rounded px-3 py-1.5"
          >
            Copy to {formatMonth(shiftMonth(month, 1))}
          </button>
        </div>
      )}
    </div>
  );
}
