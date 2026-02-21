"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, PetExpense } from "@/lib/types";

const columns: Column[] = [
  { key: "description", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "date", label: "Date", type: "date" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function PetPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const sorted = [...state.petExpenses].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  const totalInDisplay = state.petExpenses.reduce(
    (sum, e) => sum + convert(e.amount, e.currency),
    0
  );

  const handleAdd = (row: Record<string, unknown>) => {
    const expense: PetExpense = {
      id: crypto.randomUUID(),
      description: String(row.description || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || "CAD",
      date: String(row.date || ""),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "ADD_PET_EXPENSE", payload: expense });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.petExpenses.find((e) => e.id === row.id);
    if (!existing) return;
    const updated: PetExpense = {
      ...existing,
      description: String(row.description || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || existing.currency,
      date: String(row.date || ""),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_PET_EXPENSE", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Pet Expenses</h1>
      <p className="text-xs text-zinc-400 mb-6">
        Track spending on the doggo. Not included in dashboard totals.
      </p>

      <EditableTable
        title="Expenses"
        columns={columns}
        rows={sorted}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_PET_EXPENSE", payload: id })}
        defaultValues={{ currency: "CAD" }}
      />

      {state.petExpenses.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-zinc-500">Total Spent ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(totalInDisplay, displayCurrency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Entries</div>
              <div className="font-mono text-sm text-zinc-700">
                {state.petExpenses.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
