"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney } from "@/lib/format";
import type { Currency, FamilyDebt } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  { key: "familyMember", label: "Family Member", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD", "GBP", "EUR"] },
  { key: "notes", label: "Notes", type: "text" },
];

export default function FamilyDebtsPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  if (!isLoaded) return <Skeleton className="h-6 w-48" />;

  const manualDebts = state.familyDebts.filter((d) => !d.linkedOwedId);
  const linkedDebts = state.familyDebts.filter((d) => !!d.linkedOwedId);

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
      sortOrder: Math.max(0, ...manualDebts.map((d) => d.sortOrder)) + 1,
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
      <h1 className="text-lg font-semibold mb-1">Family Debts</h1>
      <p className="text-xs text-muted-foreground mb-6">
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
        onReorder={(ids) => dispatch({ type: "REORDER", payload: { stateKey: "familyDebts", orderedIds: ids } })}
      />

      {linkedDebts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Linked Debts</h2>
            <Badge variant="secondary" className="font-mono text-xs">
              read-only
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Creditor</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Description</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Paid</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Remaining</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedDebts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.familyMember}</TableCell>
                  <TableCell>{d.description}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(d.amount, d.currency)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(d.paid ?? 0, d.currency)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(d.amount - (d.paid ?? 0), d.currency)}</TableCell>
                  <TableCell>
                    {d.paidOff ? (
                      <Badge variant="secondary" className="text-green-600 text-xs">Paid off</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-amber-600 text-xs">Outstanding</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {state.familyDebts.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Summary by Family Member
            </div>
            <div className="grid grid-cols-4 gap-4">
              {totalByMember.map(({ member, total }) => (
                <div key={member}>
                  <div className="text-xs text-muted-foreground">{member}</div>
                  <div className="font-mono text-sm">
                    {formatMoney(total, displayCurrency)}
                  </div>
                </div>
              ))}
              <div>
                <div className="text-xs text-muted-foreground">Total ({displayCurrency})</div>
                <div className="font-mono text-sm font-semibold">
                  {formatMoney(totalInDisplay, displayCurrency)}
                </div>
              </div>
            </div>

            {linkedDebts.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  Linked Debts
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Owed</div>
                    <div className="font-mono text-sm font-semibold">
                      {formatMoney(linkedTotal, displayCurrency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {linkedDebts.length} linked debt{linkedDebts.length !== 1 && "s"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Outstanding</div>
                    <div className="font-mono text-sm font-semibold text-negative">
                      {formatMoney(linkedOutstanding, displayCurrency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {linkedDebts.filter((d) => !d.paidOff).length} not paid off
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Paid Off</div>
                    <div className="font-mono text-sm font-semibold text-emerald-600">
                      {formatMoney(linkedTotal - linkedOutstanding, displayCurrency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {linkedDebts.filter((d) => d.paidOff).length} settled
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
