"use client";

import { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column, type UserOption } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, FamilyOwed } from "@/lib/types";

const columns: Column[] = [
  { key: "person", label: "Person", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "paid", label: "Paid", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "paidOff", label: "Paid Off", type: "checkbox" },
  { key: "linkedUserId", label: "Linked User", type: "user-select" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function FamilyOwedPage() {
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

  const items = state.familyOwed;

  const totalOwed = items.reduce(
    (sum, o) => sum + convert(o.amount, o.currency),
    0
  );
  const totalPaid = items.reduce(
    (sum, o) => sum + convert(o.paid, o.currency),
    0
  );
  const totalRemaining = items.reduce(
    (sum, o) => sum + convert(o.amount - o.paid, o.currency),
    0
  );

  // Group by person
  const byPerson = new Map<string, FamilyOwed[]>();
  for (const o of items) {
    const key = o.person || "Unknown";
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(o);
  }

  const handleAdd = (row: Record<string, unknown>) => {
    const item: FamilyOwed = {
      id: crypto.randomUUID(),
      person: String(row.person || ""),
      description: String(row.description || ""),
      amount: Math.abs(Number(row.amount) || 0),
      paid: Math.abs(Number(row.paid) || 0),
      currency: (row.currency as Currency) || "USD",
      paidOff: Boolean(row.paidOff),
      notes: String(row.notes || ""),
      linkedUserId: (row.linkedUserId as string) || null,
    };
    dispatch({ type: "ADD_FAMILY_OWED", payload: item });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = items.find((o) => o.id === row.id);
    if (!existing) return;
    const updated: FamilyOwed = {
      ...existing,
      person: String(row.person || ""),
      description: String(row.description || ""),
      amount: Math.abs(Number(row.amount) || 0),
      paid: Math.abs(Number(row.paid) || 0),
      currency: (row.currency as Currency) || existing.currency,
      paidOff: Boolean(row.paidOff),
      notes: String(row.notes || ""),
      linkedUserId: (row.linkedUserId as string) || null,
    };
    dispatch({ type: "UPDATE_FAMILY_OWED", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Family Owed</h1>
      <p className="text-xs text-zinc-400 mb-6">
        Money owed to you by family/partner. Link to a platform user to show it in their Family Debts.
      </p>

      <EditableTable
        title="Owed to You"
        columns={columns}
        rows={items}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_FAMILY_OWED", payload: id })}
        defaultValues={{ currency: "USD", paid: 0, paidOff: false }}
        usersData={platformUsers}
      />

      {items.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xs text-zinc-500">Total Owed ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(totalOwed, displayCurrency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Total Paid ({displayCurrency})</div>
              <div className="font-mono text-sm text-positive">
                {formatMoney(totalPaid, displayCurrency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Remaining ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-negative">
                {formatMoney(totalRemaining, displayCurrency)}
              </div>
            </div>
          </div>

          {byPerson.size > 0 && (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3 mt-4 border-t border-zinc-100 pt-3">
                By Person
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from(byPerson.entries()).map(([person, debts]) => {
                  const remaining = debts.reduce(
                    (sum, o) => sum + convert(o.amount - o.paid, o.currency),
                    0
                  );
                  return (
                    <div key={person}>
                      <div className="text-xs text-zinc-500">{person}</div>
                      <div className="font-mono text-sm text-zinc-700">
                        {formatMoney(remaining, displayCurrency)}
                        <span className="text-zinc-400 text-xs ml-1">remaining</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
