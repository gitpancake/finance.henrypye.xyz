"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, FamilyDebt } from "@/lib/types";

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

  const manualDebts = state.familyDebts.filter((d) => !d.linkedOwedId);
  const linkedDebts = state.familyDebts.filter((d) => !!d.linkedOwedId);

  // Group all debts by family member for summary
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

  const linkedTotal = linkedDebts.reduce(
    (sum, d) => sum + convert(d.amount, d.currency), 0
  );
  const linkedOutstanding = linkedDebts
    .filter((d) => !d.paidOff)
    .reduce((sum, d) => sum + convert(d.amount - (d.paid ?? 0), d.currency), 0);

  const handleAdd = (row: Record<string, unknown>) => {
    const debt: FamilyDebt = {
      id: crypto.randomUUID(),
      familyMember: String(row.familyMember || ""),
      description: String(row.description || ""),
      currency: (row.currency as Currency) || "CAD",
      amount: Math.abs(Number(row.amount) || 0),
      notes: String(row.notes || ""),
      linkedOwedId: null,
      paid: null,
      paidOff: null,
    };
    dispatch({ type: "ADD_FAMILY_DEBT", payload: debt });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = manualDebts.find((d) => d.id === row.id);
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
        rows={manualDebts}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_FAMILY_DEBT", payload: id })}
        defaultValues={{ currency: "CAD" }}
      />

      {linkedDebts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-zinc-700">Linked Debts</h2>
            <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
              read-only
            </span>
          </div>
          <table className="sheet">
            <thead>
              <tr>
                <th>Creditor</th>
                <th>Description</th>
                <th style={{ width: "90px" }}>Amount</th>
                <th style={{ width: "90px" }}>Paid</th>
                <th style={{ width: "90px" }}>Remaining</th>
                <th style={{ width: "70px" }}>Currency</th>
                <th style={{ width: "70px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {linkedDebts.map((d) => (
                <tr key={d.id}>
                  <td>{d.familyMember}</td>
                  <td>{d.description}</td>
                  <td className="num">{formatMoney(d.amount, d.currency)}</td>
                  <td className="num">{formatMoney(d.paid ?? 0, d.currency)}</td>
                  <td className="num">{formatMoney(d.amount - (d.paid ?? 0), d.currency)}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">
                      {d.currency}
                    </span>
                  </td>
                  <td>
                    {d.paidOff ? (
                      <span className="text-xs text-green-600 font-medium">Paid off</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Outstanding</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

          {linkedDebts.length > 0 && (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3 mt-4 border-t border-zinc-100 pt-3">
                Linked Debts
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Total Owed</div>
                  <div className="font-mono text-sm font-semibold text-zinc-900">
                    {formatMoney(linkedTotal, displayCurrency)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {linkedDebts.length} linked debt{linkedDebts.length !== 1 && "s"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Outstanding</div>
                  <div className="font-mono text-sm font-semibold text-negative">
                    {formatMoney(linkedOutstanding, displayCurrency)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {linkedDebts.filter((d) => !d.paidOff).length} not paid off
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Paid Off</div>
                  <div className="font-mono text-sm font-semibold text-emerald-600">
                    {formatMoney(linkedTotal - linkedOutstanding, displayCurrency)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {linkedDebts.filter((d) => d.paidOff).length} settled
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
