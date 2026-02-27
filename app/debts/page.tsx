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

  const activeDebts = state.debts.filter((d) => !d.paidOff);
  const repaidDebts = state.debts.filter((d) => d.paidOff);

  const totalByC = CURRENCIES.reduce(
    (acc, c) => {
      acc[c] = activeDebts
        .filter((d) => d.currency === c)
        .reduce((sum, d) => sum + d.amount, 0);
      return acc;
    },
    {} as Record<Currency, number>
  );

  const totalInDisplay = activeDebts.reduce(
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
      paidOff: false,
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

  const handleMarkRepaid = (id: string) => {
    const existing = state.debts.find((d) => d.id === id);
    if (!existing) return;
    dispatch({ type: "UPDATE_DEBT", payload: { ...existing, paidOff: true } });
  };

  const handleReactivate = (id: string) => {
    const existing = state.debts.find((d) => d.id === id);
    if (!existing) return;
    dispatch({ type: "UPDATE_DEBT", payload: { ...existing, paidOff: false } });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Debts</h1>

      <EditableTable
        title="Money Owed"
        columns={columns}
        rows={activeDebts}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_DEBT", payload: id })}
        defaultValues={{ currency: "CAD" }}
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "debts", orderedIds: ids } })}
        rowActions={(row) => (
          <button
            onClick={() => handleMarkRepaid(row.id as string)}
            className="text-xs text-zinc-400 hover:text-green-600 cursor-pointer lg:opacity-30 lg:group-hover:opacity-100 transition-opacity"
          >
            Repaid
          </button>
        )}
      />

      {activeDebts.length > 0 && (
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

      {repaidDebts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Repaid</h2>
          <div className="overflow-x-auto">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Creditor</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Currency</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {repaidDebts.map((d) => (
                  <tr key={d.id} className="opacity-60">
                    <td className="line-through">{d.creditor}</td>
                    <td className="num line-through">{formatMoney(d.amount, d.currency)}</td>
                    <td className="text-xs text-zinc-500">{d.currency}</td>
                    <td className="text-xs text-zinc-400">{d.notes}</td>
                    <td>
                      <button
                        onClick={() => handleReactivate(d.id)}
                        className="text-xs text-zinc-400 hover:text-amber-600 cursor-pointer transition-colors"
                      >
                        Undo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
