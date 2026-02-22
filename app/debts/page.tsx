"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, Debt } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";

const columns: Column[] = [
  { key: "creditor", label: "Creditor", type: "text" },
  { key: "amount", label: "Amount Owed", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "notes", label: "Notes", type: "text" },
];

export default function DebtsPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const totalByC = CURRENCIES.reduce(
    (acc, c) => {
      acc[c] = state.debts
        .filter((d) => d.currency === c)
        .reduce((sum, d) => sum + d.amount, 0);
      return acc;
    },
    {} as Record<Currency, number>
  );

  const totalInDisplay = state.debts.reduce(
    (sum, d) => sum + convert(d.amount, d.currency),
    0
  );

  const handleAdd = (row: Record<string, unknown>) => {
    const debt: Debt = {
      id: crypto.randomUUID(),
      creditor: String(row.creditor || ""),
      currency: (row.currency as Currency) || "CAD",
      amount: Math.abs(Number(row.amount) || 0),
      notes: String(row.notes || ""),
      sortOrder: Math.max(0, ...state.debts.map((d) => d.sortOrder)) + 1,
    };
    dispatch({ type: "ADD_DEBT", payload: debt });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.debts.find((d) => d.id === row.id);
    if (!existing) return;
    const updated: Debt = {
      ...existing,
      creditor: String(row.creditor || ""),
      currency: (row.currency as Currency) || existing.currency,
      amount: Math.abs(Number(row.amount) || 0),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_DEBT", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Debts</h1>

      <EditableTable
        title="Money Owed"
        columns={columns}
        rows={state.debts}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_DEBT", payload: id })}
        defaultValues={{ currency: "CAD" }}
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "debts", orderedIds: ids } })}
      />

      {state.debts.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-4 gap-4">
            {CURRENCIES.map(
              (c) =>
                totalByC[c] > 0 && (
                  <div key={c}>
                    <div className="text-xs text-zinc-500">{c}</div>
                    <div className="font-mono text-sm text-negative">
                      {formatMoney(totalByC[c], c)}
                    </div>
                  </div>
                )
            )}
            <div>
              <div className="text-xs text-zinc-500">Total ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-negative">
                {formatMoney(totalInDisplay, displayCurrency)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
