"use client";

import { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column, type UserOption } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, PetExpense } from "@/lib/types";

const columns: Column[] = [
  { key: "description", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "date", label: "Date", type: "date" },
  { key: "sharedWithUserId", label: "Share With", type: "user-select" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function PetPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();
  const [platformUsers, setPlatformUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlatformUsers(data.map((u: { id: string; username: string }) => ({ value: u.id, label: u.username })));
        }
      })
      .catch(() => {});
  }, []);

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const sorted = state.petExpenses;

  const totalInDisplay = state.petExpenses.reduce(
    (sum, e) => sum + convert(e.amount, e.currency),
    0
  );

  const sharedExpenses = state.sharedPetExpenses;
  const sharedTotal = sharedExpenses.reduce(
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
      sharedWithUserId: (row.sharedWithUserId as string) || null,
      sortOrder: Math.max(0, ...state.petExpenses.map((e) => e.sortOrder)) + 1,
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
      sharedWithUserId: (row.sharedWithUserId as string) || null,
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
        defaultValues={{ currency: "CAD", sharedWithUserId: null }}
        usersData={platformUsers}
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "petExpenses", orderedIds: ids } })}
      />

      {sharedExpenses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-zinc-700">Shared With You</h2>
            <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
              view-only
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="sheet">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...sharedExpenses]
                  .sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return b.date.localeCompare(a.date);
                  })
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="text-xs text-zinc-500">{e.ownerName}</td>
                      <td>{e.description}</td>
                      <td className="num">{formatMoney(e.amount, e.currency)}</td>
                      <td className="text-xs text-zinc-500">
                        {e.date
                          ? new Date(e.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="text-xs text-zinc-400">{e.notes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(state.petExpenses.length > 0 || sharedExpenses.length > 0) && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-zinc-500">Your Total ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(totalInDisplay, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {state.petExpenses.length} expense{state.petExpenses.length !== 1 && "s"}
              </div>
            </div>
            {sharedExpenses.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500">Shared With You ({displayCurrency})</div>
                <div className="font-mono text-sm text-zinc-700">
                  {formatMoney(sharedTotal, displayCurrency)}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {sharedExpenses.length} expense{sharedExpenses.length !== 1 && "s"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
