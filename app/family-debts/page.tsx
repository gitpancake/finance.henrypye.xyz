"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, FamilyDebt } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";

const columns: Column[] = [
  { key: "familyMember", label: "Family Member", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "notes", label: "Notes", type: "text" },
];

export default function FamilyDebtsPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  // Group by family member
  const byMember = new Map<string, FamilyDebt[]>();
  for (const d of state.familyDebts) {
    const key = d.familyMember || "Unknown";
    if (!byMember.has(key)) byMember.set(key, []);
    byMember.get(key)!.push(d);
  }

  const totalByMember = Array.from(byMember.entries()).map(([member, debts]) => ({
    member,
    total: debts.reduce((sum, d) => sum + convert(d.amount, d.currency), 0),
  }));

  const totalInDisplay = state.familyDebts.reduce(
    (sum, d) => sum + convert(d.amount, d.currency),
    0
  );

  const handleAdd = (row: Record<string, unknown>) => {
    const debt: FamilyDebt = {
      id: crypto.randomUUID(),
      familyMember: String(row.familyMember || ""),
      description: String(row.description || ""),
      currency: (row.currency as Currency) || "CAD",
      amount: Math.abs(Number(row.amount) || 0),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "ADD_FAMILY_DEBT", payload: debt });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.familyDebts.find((d) => d.id === row.id);
    if (!existing) return;
    const updated: FamilyDebt = {
      ...existing,
      familyMember: String(row.familyMember || ""),
      description: String(row.description || ""),
      currency: (row.currency as Currency) || existing.currency,
      amount: Math.abs(Number(row.amount) || 0),
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_FAMILY_DEBT", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Family Debts</h1>
      <p className="text-xs text-zinc-400 mb-6">
        Track money lent by family members. Not included in your total debt calculations.
      </p>

      <EditableTable
        title="Family Loans"
        columns={columns}
        rows={state.familyDebts}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_FAMILY_DEBT", payload: id })}
        defaultValues={{ currency: "CAD" }}
      />

      {state.familyDebts.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Summary by Family Member
          </div>
          <div className="grid grid-cols-4 gap-4">
            {totalByMember.map(({ member, total }) => (
              <div key={member}>
                <div className="text-xs text-zinc-500">{member}</div>
                <div className="font-mono text-sm text-zinc-700">
                  {formatMoney(total, displayCurrency)}
                </div>
              </div>
            ))}
            <div>
              <div className="text-xs text-zinc-500">Total ({displayCurrency})</div>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(totalInDisplay, displayCurrency)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
