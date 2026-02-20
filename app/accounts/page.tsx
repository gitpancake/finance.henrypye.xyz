"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Account } from "@/lib/types";

const bankColumns: Column[] = [
  { key: "name", label: "Account Name", type: "text" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "balance", label: "Balance", type: "number" },
  { key: "isOutgoingsAccount", label: "Outgoings", type: "checkbox" },
  { key: "notes", label: "Notes", type: "text" },
];

const ccColumns: Column[] = [
  { key: "name", label: "Card Name", type: "text" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "balance", label: "Balance Owed", type: "number" },
  { key: "notes", label: "Notes", type: "text" },
];

export default function AccountsPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const banks = state.accounts.filter((a) => a.type === "bank");
  const cards = state.accounts.filter((a) => a.type === "credit_card");

  const totalBank = banks.reduce(
    (sum, a) => sum + convert(a.balance, a.currency),
    0
  );
  const totalCards = cards.reduce(
    (sum, a) => sum + convert(Math.abs(a.balance), a.currency),
    0
  );

  const handleAddBank = (row: Record<string, unknown>) => {
    const account: Account = {
      id: crypto.randomUUID(),
      name: String(row.name || ""),
      type: "bank",
      currency: (row.currency as Account["currency"]) || "CAD",
      balance: Number(row.balance) || 0,
      isOutgoingsAccount: !!row.isOutgoingsAccount,
      notes: String(row.notes || ""),
    };
    dispatch({ type: "ADD_ACCOUNT", payload: account });
  };

  const handleAddCard = (row: Record<string, unknown>) => {
    const account: Account = {
      id: crypto.randomUUID(),
      name: String(row.name || ""),
      type: "credit_card",
      currency: (row.currency as Account["currency"]) || "GBP",
      balance: Number(row.balance) || 0,
      isOutgoingsAccount: false,
      notes: String(row.notes || ""),
    };
    dispatch({ type: "ADD_ACCOUNT", payload: account });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.accounts.find((a) => a.id === row.id);
    if (!existing) return;
    const updated: Account = {
      ...existing,
      name: String(row.name || ""),
      currency: (row.currency as Account["currency"]) || existing.currency,
      balance: Number(row.balance) || 0,
      isOutgoingsAccount: !!row.isOutgoingsAccount,
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_ACCOUNT", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Accounts</h1>

      <EditableTable
        title="Bank Accounts"
        columns={bankColumns}
        rows={banks}
        onAdd={handleAddBank}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_ACCOUNT", payload: id })}
        defaultValues={{ currency: "CAD", isOutgoingsAccount: false }}
      />

      {banks.length > 0 && (
        <div className="mb-8 text-right text-sm font-mono text-zinc-600">
          Total: {formatMoney(totalBank, displayCurrency)}
        </div>
      )}

      <EditableTable
        title="Credit Cards"
        columns={ccColumns}
        rows={cards}
        onAdd={handleAddCard}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_ACCOUNT", payload: id })}
        defaultValues={{ currency: "GBP" }}
      />

      {cards.length > 0 && (
        <div className="mb-8 text-right text-sm font-mono text-negative">
          Total Owed: {formatMoney(totalCards, displayCurrency)}
        </div>
      )}
    </div>
  );
}
