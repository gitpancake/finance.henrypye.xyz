"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, Debt } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const columns: Column[] = [
  { key: "creditor", label: "Creditor", type: "text" },
  { key: "amount", label: "Amount Owed", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "notes", label: "Notes", type: "text" },
];

export default function DebtsPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <Skeleton className="h-6 w-48" />;

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
      <h1 className="text-lg font-semibold mb-6">Debts</h1>

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
            className="text-xs text-muted-foreground hover:text-green-600 cursor-pointer lg:opacity-30 lg:group-hover:opacity-100 transition-opacity"
          >
            Repaid
          </button>
        )}
      />

      {activeDebts.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Summary
            </div>
            <div className="grid grid-cols-4 gap-4">
              {CURRENCIES.map(
                (c) =>
                  totalByC[c] > 0 && (
                    <div key={c}>
                      <div className="text-xs text-muted-foreground">{c}</div>
                      <div className="font-mono text-sm text-negative">
                        {formatMoney(totalByC[c], c)}
                      </div>
                    </div>
                  )
              )}
              <div>
                <div className="text-xs text-muted-foreground">Total ({displayCurrency})</div>
                <div className="font-mono text-sm font-semibold text-negative">
                  {formatMoney(totalInDisplay, displayCurrency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {repaidDebts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Repaid</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Creditor</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Currency</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Notes</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {repaidDebts.map((d) => (
                <TableRow key={d.id} className="opacity-60">
                  <TableCell className="line-through">{d.creditor}</TableCell>
                  <TableCell className="text-right font-mono line-through">{formatMoney(d.amount, d.currency)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.currency}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.notes}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(d.id)}
                      className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground hover:text-amber-600"
                    >
                      Undo
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
