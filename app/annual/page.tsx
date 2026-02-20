"use client";

import { useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, AnnualSubscription } from "@/lib/types";
import { yearlyAmount } from "@/lib/subscriptions";

const columns: Column[] = [
  { key: "label", label: "Subscription", type: "text" },
  { key: "amount", label: "Cost", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "nextRenewal", label: "Next Renewal", type: "date" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function AnnualPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const subs = state.annualSubscriptions;

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
        defaultValues={{ currency: "USD" }}
      />

      {subs.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-3 gap-6">
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
              <div className="text-xs text-zinc-500">Per Month</div>
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
          </div>
        </div>
      )}
    </div>
  );
}
