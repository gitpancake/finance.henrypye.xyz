"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, Incoming, IncomingStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const columns: Column[] = [
  { key: "source", label: "Source", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "status", label: "Status", type: "select", options: ["pending", "received"] },
  { key: "notes", label: "Notes", type: "text" },
];

export default function IncomingPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <Skeleton className="h-6 w-48" />;

  const pending = state.incomings.filter((i) => i.status === "pending");
  const received = state.incomings.filter((i) => i.status === "received");

  const totalPending = pending.reduce(
    (sum, i) => sum + convert(i.amount, i.currency),
    0
  );
  const totalReceived = received.reduce(
    (sum, i) => sum + convert(i.amount, i.currency),
    0
  );

  const handleAdd = (row: Record<string, unknown>) => {
    const incoming: Incoming = {
      id: crypto.randomUUID(),
      source: String(row.source || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || "CAD",
      status: (row.status as IncomingStatus) || "pending",
      notes: String(row.notes || ""),
      sortOrder: Math.max(0, ...state.incomings.map((i) => i.sortOrder)) + 1,
    };
    dispatch({ type: "ADD_INCOMING", payload: incoming });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.incomings.find((i) => i.id === row.id);
    if (!existing) return;
    const updated: Incoming = {
      ...existing,
      source: String(row.source || ""),
      amount: Math.abs(Number(row.amount) || 0),
      currency: (row.currency as Currency) || existing.currency,
      status: (row.status as IncomingStatus) || existing.status,
      notes: String(row.notes || ""),
    };
    dispatch({ type: "UPDATE_INCOMING", payload: updated });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Incoming Money</h1>

      <EditableTable
        title="Expected & Received"
        columns={columns}
        rows={state.incomings}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_INCOMING", payload: id })}
        defaultValues={{ currency: "USD", status: "pending" }}
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "incomings", orderedIds: ids } })}
      />

      {state.incomings.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Summary
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-mono text-lg font-semibold text-amber-600">
                  {formatMoney(totalPending, displayCurrency)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pending.length} item{pending.length !== 1 && "s"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="font-mono text-lg font-semibold text-positive">
                  {formatMoney(totalReceived, displayCurrency)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {received.length} item{received.length !== 1 && "s"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-mono text-lg font-semibold">
                  {formatMoney(totalPending + totalReceived, displayCurrency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
