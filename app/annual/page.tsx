"use client";

import { useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column, type UserOption } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, AnnualSubscription } from "@/lib/types";
import { yearlyAmount } from "@/lib/subscriptions";

const columns: Column[] = [
  { key: "label", label: "Subscription", type: "text" },
  { key: "amount", label: "Cost", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "accountId", label: "Account", type: "user-select" },
  { key: "nextRenewal", label: "Next Renewal", type: "date" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function AnnualPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  const accountOptions: UserOption[] = state.accounts.map((a) => ({ value: a.id, label: a.name }));

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const subs = state.annualSubscriptions;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const dueThisMonth = useMemo(() => {
    return subs.filter((s) => {
      if (!s.nextRenewal) return false;
      const d = new Date(s.nextRenewal);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [subs, currentMonth, currentYear]);

  const dueThisMonthTotal = useMemo(
    () => dueThisMonth.reduce((sum, s) => sum + convert(s.amount, s.currency), 0),
    [dueThisMonth, convert]
  );

  const totals = useMemo(() => {
    const perYear = subs.reduce(
      (sum, s) => sum + convert(yearlyAmount(s), s.currency),
      0
    );
    return { perYear, perMonth: perYear / 12, perDay: perYear / 365 };
  }, [subs, convert]);

  const handleAdd = (row: Record<string, unknown>) => {
    const sub: AnnualSubscription = {
      id: crypto.randomUUID(),
      label: String(row.label || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || "CAD",
      nextRenewal: String(row.nextRenewal || ""),
      notes: String(row.notes || ""),
      accountId: (row.accountId as string) || null,
      sortOrder: Math.max(0, ...subs.map((s) => s.sortOrder)) + 1,
    };
    dispatch({ type: "ADD_ANNUAL_SUB", payload: sub });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = subs.find((s) => s.id === row.id);
    if (!existing) return;
    const updated: AnnualSubscription = {
      ...existing,
      label: String(row.label || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || existing.currency,
      nextRenewal: String(row.nextRenewal || ""),
      notes: String(row.notes || ""),
      accountId: (row.accountId as string) || null,
    };
    dispatch({ type: "UPDATE_ANNUAL_SUB", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Annual Subscriptions</h1>

      <EditableTable
        title="Subscriptions & Renewals"
        columns={columns}
        rows={subs}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_ANNUAL_SUB", payload: id })}
        defaultValues={{ currency: "USD", accountId: null }}
        usersData={accountOptions}
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "annualSubscriptions", orderedIds: ids } })}
      />

      {subs.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-zinc-500">Per Year</div>
              <div className="font-mono text-lg font-semibold text-negative">
                {formatMoney(totals.perYear, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {subs.length} subscription{subs.length !== 1 && "s"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Per Month (avg)</div>
              <div className="font-mono text-lg font-semibold text-negative">
                {formatMoney(totals.perMonth, displayCurrency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Per Day</div>
              <div className="font-mono text-lg font-semibold text-zinc-700">
                {formatMoney(totals.perDay, displayCurrency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Due This Month</div>
              <div className="font-mono text-lg font-semibold text-negative">
                {formatMoney(dueThisMonthTotal, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {dueThisMonth.length} renewal{dueThisMonth.length !== 1 && "s"}
              </div>
            </div>
          </div>

          {dueThisMonth.length > 0 && (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3 mt-4 border-t border-zinc-100 pt-3">
                Renewals This Month
              </div>
              <div className="space-y-1.5">
                {dueThisMonth.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-700">{s.label}</span>
                      <span className="text-xs text-zinc-400">
                        {new Date(s.nextRenewal).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <span className="font-mono text-negative">
                      {formatMoney(s.amount, s.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
