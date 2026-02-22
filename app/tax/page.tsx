"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { calculateTax } from "@/lib/tax";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";

export default function TaxPage() {
  const { state } = useFinance();
  const { displayCurrency, convert } = useCurrency();

  // Pre-fill from the latest budget's income item
  const budgetIncome = useMemo(() => {
    const latest = [...state.budgets].sort((a, b) => b.month.localeCompare(a.month))[0];
    return latest?.lineItems.find((li) => li.category === "income") ?? null;
  }, [state.budgets]);

  const [income, setIncome] = useState(0);
  const [incomeCurrency, setIncomeCurrency] = useState<Currency>("CAD");
  const [prefilled, setPrefilled] = useState(false);

  // Sync once when budget data arrives
  if (budgetIncome && !prefilled && income === 0) {
    setIncome(budgetIncome.amount);
    setIncomeCurrency(budgetIncome.currency);
    setPrefilled(true);
  }

  const annualGrossCAD = useMemo(
    () => convert(income, incomeCurrency, "CAD") ,
    [income, incomeCurrency, convert]
  );

  const tax = useMemo(() => calculateTax(annualGrossCAD), [annualGrossCAD]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">
        Tax Calculator (BC, Canada)
      </h1>

      {/* Input */}
      <div className="flex gap-3 mb-8 max-w-md">
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">
            Annual Gross Income
          </label>
          <input
            type="number"
            value={income || ""}
            onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
            className="w-full rounded border border-zinc-200 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400"
            placeholder="0.00"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-zinc-500 mb-1">Currency</label>
          <select
            value={incomeCurrency}
            onChange={(e) => setIncomeCurrency(e.target.value as Currency)}
            className="w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {prefilled && (
          <div className="text-xs text-zinc-400 mt-1.5">Pre-filled from your budget</div>
        )}
      </div>

      {annualGrossCAD > 0 && (
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Bracket breakdown */}
          <div>
            {/* Federal */}
            <h2 className="text-sm font-semibold text-zinc-700 mb-2">
              Federal Tax Brackets
            </h2>
            <table className="sheet mb-6">
              <thead>
                <tr>
                  <th>Bracket</th>
                  <th style={{ textAlign: "right" }}>Taxable</th>
                  <th style={{ textAlign: "right" }}>Tax</th>
                </tr>
              </thead>
              <tbody>
                {tax.federalByBracket
                  .filter((b) => b.taxableInBracket > 0)
                  .map((b) => (
                    <tr key={b.bracket}>
                      <td className="text-xs text-zinc-600">{b.bracket}</td>
                      <td className="num">
                        {formatMoney(b.taxableInBracket, "CAD")}
                      </td>
                      <td className="num">{formatMoney(b.tax, "CAD")}</td>
                    </tr>
                  ))}
                <tr className="font-semibold">
                  <td>Federal Total</td>
                  <td></td>
                  <td className="num">{formatMoney(tax.federalTax, "CAD")}</td>
                </tr>
              </tbody>
            </table>

            {/* Provincial */}
            <h2 className="text-sm font-semibold text-zinc-700 mb-2">
              BC Provincial Tax Brackets
            </h2>
            <table className="sheet">
              <thead>
                <tr>
                  <th>Bracket</th>
                  <th style={{ textAlign: "right" }}>Taxable</th>
                  <th style={{ textAlign: "right" }}>Tax</th>
                </tr>
              </thead>
              <tbody>
                {tax.provincialByBracket
                  .filter((b) => b.taxableInBracket > 0)
                  .map((b) => (
                    <tr key={b.bracket}>
                      <td className="text-xs text-zinc-600">{b.bracket}</td>
                      <td className="num">
                        {formatMoney(b.taxableInBracket, "CAD")}
                      </td>
                      <td className="num">{formatMoney(b.tax, "CAD")}</td>
                    </tr>
                  ))}
                <tr className="font-semibold">
                  <td>BC Total</td>
                  <td></td>
                  <td className="num">
                    {formatMoney(tax.provincialTax, "CAD")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Summary */}
          <div>
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4">
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
                      <hr className="my-2 border-zinc-200" />
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
            </div>

            {/* IEC Notes */}
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                IEC Visa Tax Notes
              </h3>
              <ul className="space-y-2 text-xs text-blue-800 leading-relaxed">
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
            </div>
          </div>
        </div>
      )}

      {annualGrossCAD === 0 && (
        <div className="text-sm text-zinc-400 text-center mt-8">
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
            ? "font-semibold text-zinc-900"
            : muted
              ? "text-zinc-400"
              : "text-zinc-600"
        }`}
      >
        {label}
      </td>
      <td
        className={`py-1.5 text-right font-mono ${
          bold
            ? "font-semibold text-zinc-900"
            : negative
              ? "text-negative"
              : muted
                ? "text-zinc-400"
                : "text-zinc-700"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
