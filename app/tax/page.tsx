"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { calculateTax } from "@/lib/tax";
import type { TaxOptions } from "@/lib/tax";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Currency } from "@/lib/types";
import {
  CURRENCIES,
  FEDERAL_BASIC_PERSONAL_AMOUNT,
  BC_BASIC_PERSONAL_AMOUNT,
  FEDERAL_SPOUSE_AMOUNT,
  BC_SPOUSE_AMOUNT,
} from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default function TaxPage() {
  const { state } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  const budgetIncome = useMemo(() => {
    const latest = [...state.budgets].sort((a, b) => b.month.localeCompare(a.month))[0];
    return latest?.lineItems.find((li) => li.category === "income") ?? null;
  }, [state.budgets]);

  const [income, setIncome] = useState(0);
  const [incomeCurrency, setIncomeCurrency] = useState<Currency>("CAD");
  const [prefilled, setPrefilled] = useState(false);
  const [claimBPA, setClaimBPA] = useState(true);
  const [claimSpouseAmount, setClaimSpouseAmount] = useState(false);

  if (budgetIncome && !prefilled && income === 0) {
    setIncome(budgetIncome.amount);
    setIncomeCurrency(budgetIncome.currency);
    setPrefilled(true);
  }

  const annualGrossCAD = useMemo(
    () => convert(income, incomeCurrency, "CAD"),
    [income, incomeCurrency, convert]
  );

  const taxOptions: TaxOptions = useMemo(
    () => ({ claimBPA, claimSpouseAmount }),
    [claimBPA, claimSpouseAmount]
  );
  const tax = useMemo(
    () => calculateTax(annualGrossCAD, taxOptions),
    [annualGrossCAD, taxOptions]
  );

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">
        Tax Calculator (BC, Canada)
      </h1>

      {/* Input */}
      <div className="flex gap-3 mb-8 max-w-md">
        <div className="flex-1 space-y-1.5">
          <Label>Annual Gross Income</Label>
          <Input
            type="number"
            value={income || ""}
            onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
            className="font-mono"
            placeholder="0.00"
          />
        </div>
        <div className="w-24 space-y-1.5">
          <Label>Currency</Label>
          <select
            value={incomeCurrency}
            onChange={(e) => setIncomeCurrency(e.target.value as Currency)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {prefilled && (
          <div className="text-xs text-muted-foreground mt-1.5">Pre-filled from your budget</div>
        )}
      </div>

      {/* Tax Credits */}
      <div className="mb-8 max-w-md space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Non-Refundable Tax Credits
        </p>
        <div className="flex items-start gap-2">
          <Checkbox
            id="bpa"
            checked={claimBPA}
            onCheckedChange={(v) => setClaimBPA(v === true)}
          />
          <label htmlFor="bpa" className="text-sm leading-tight cursor-pointer">
            Basic Personal Amount
            <span className="block text-xs text-muted-foreground mt-0.5">
              Federal: ${FEDERAL_BASIC_PERSONAL_AMOUNT.toLocaleString()} &middot; BC: ${BC_BASIC_PERSONAL_AMOUNT.toLocaleString()}
            </span>
          </label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="spouse"
            checked={claimSpouseAmount}
            onCheckedChange={(v) => setClaimSpouseAmount(v === true)}
          />
          <label htmlFor="spouse" className="text-sm leading-tight cursor-pointer">
            Spouse / Common-Law Partner Amount
            <span className="block text-xs text-muted-foreground mt-0.5">
              Federal: ${FEDERAL_SPOUSE_AMOUNT.toLocaleString()} &middot; BC: ${BC_SPOUSE_AMOUNT.toLocaleString()} (assumes partner has $0 income)
            </span>
          </label>
        </div>
      </div>

      {annualGrossCAD > 0 && (
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Bracket breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Federal Tax Brackets
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Bracket</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Taxable</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tax.federalByBracket
                  .filter((b) => b.taxableInBracket > 0)
                  .map((b) => (
                    <TableRow key={b.bracket}>
                      <TableCell className="text-xs text-muted-foreground">{b.bracket}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(b.taxableInBracket, "CAD")}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(b.tax, "CAD")}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold">
                  <TableCell>Federal Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(tax.federalTax, "CAD")}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <h2 className="text-sm font-semibold text-muted-foreground mb-2 mt-6">
              BC Provincial Tax Brackets
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Bracket</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Taxable</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tax.provincialByBracket
                  .filter((b) => b.taxableInBracket > 0)
                  .map((b) => (
                    <TableRow key={b.bracket}>
                      <TableCell className="text-xs text-muted-foreground">{b.bracket}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(b.taxableInBracket, "CAD")}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(b.tax, "CAD")}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold">
                  <TableCell>BC Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(tax.provincialTax, "CAD")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Right: Summary */}
          <div>
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold mb-4">
                  Tax Summary
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    <SummaryRow
                      label="Gross Annual Income"
                      value={formatMoney(annualGrossCAD, "CAD")}
                    />
                    <SummaryRow
                      label="Federal Tax"
                      value={formatMoney(tax.federalTax, "CAD")}
                      negative
                    />
                    <SummaryRow
                      label="BC Provincial Tax"
                      value={formatMoney(tax.provincialTax, "CAD")}
                      negative
                    />
                    <SummaryRow
                      label="CPP Contributions"
                      value={formatMoney(tax.cpp, "CAD")}
                      negative
                    />
                    {tax.cpp2 > 0 && (
                      <SummaryRow
                        label="CPP2 Contributions"
                        value={formatMoney(tax.cpp2, "CAD")}
                        negative
                      />
                    )}
                    <SummaryRow
                      label="EI Premiums"
                      value={formatMoney(tax.ei, "CAD")}
                      negative
                    />
                    <tr>
                      <td colSpan={2}>
                        <Separator className="my-2" />
                      </td>
                    </tr>
                    <SummaryRow
                      label="Total Deductions"
                      value={formatMoney(tax.totalDeductions, "CAD")}
                      negative
                      bold
                    />
                    <SummaryRow
                      label="Net Annual Income"
                      value={formatMoney(tax.netIncome, "CAD")}
                      bold
                    />
                    <SummaryRow
                      label="Net Monthly Income"
                      value={formatMoney(tax.monthlyNet, "CAD")}
                      bold
                    />
                    <SummaryRow
                      label="Effective Tax Rate"
                      value={formatPercent(tax.effectiveRate)}
                      muted
                    />
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* IEC Notes */}
            <Alert className="mt-6 border-info/30 bg-info/5">
              <AlertTitle className="text-info font-semibold">
                IEC Visa Tax Notes
              </AlertTitle>
              <AlertDescription>
                <ul className="space-y-2 text-xs leading-relaxed mt-2">
                  <li>
                    <strong>Residency:</strong> If you are in Canada for 183+ days
                    in the tax year, you are considered a tax resident and taxed on
                    worldwide income.
                  </li>
                  <li>
                    <strong>UK-Canada Tax Treaty:</strong> Prevents double
                    taxation. Tax paid in Canada can be credited against UK tax
                    liability. File in both countries.
                  </li>
                  <li>
                    <strong>Standard rates:</strong> IEC holders pay the same tax
                    rates as Canadian residents. No special IEC exemption.
                  </li>
                  <li>
                    <strong>CPP/EI:</strong> IEC holders contribute to CPP and EI.
                    CPP may be refundable under the UK-Canada social security
                    agreement.
                  </li>
                  <li>
                    <strong>Filing:</strong> Must file a T1 General return if you
                    owe tax or want a refund.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {annualGrossCAD === 0 && (
        <div className="text-sm text-muted-foreground text-center mt-8">
          Enter your annual gross income to see a full tax breakdown.
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  negative,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <tr>
      <td
        className={`py-1.5 ${
          bold
            ? "font-semibold"
            : muted
              ? "text-muted-foreground"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </td>
      <td
        className={`py-1.5 text-right font-mono ${
          bold
            ? "font-semibold"
            : negative
              ? "text-negative"
              : muted
                ? "text-muted-foreground"
                : ""
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
