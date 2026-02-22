"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import SummaryCard from "@/components/SummaryCard";
import NetWorthBar from "@/components/NetWorthBar";
import CurrencyBadge from "@/components/CurrencyBadge";
import { formatMoney } from "@/lib/format";
import { yearlyAmount } from "@/lib/subscriptions";
import type { Currency } from "@/lib/types";

export default function Dashboard() {
  const { state, isLoaded } = useFinance();
  const { displayCurrency, convert, convertCrypto, rates } = useCurrency();

  const summary = useMemo(() => {
    if (!rates) return { assets: 0, debts: 0, cash: 0, creditCards: 0, pendingIncoming: 0, annualCosts: 0, monthlyExpenses: 0, oneOffExpenses: 0, annualSubCosts: 0, monthlyRent: 0 };

    const bankAssets = state.accounts
      .filter((a) => a.type === "bank")
      .reduce((sum, a) => sum + convert(a.balance, a.currency), 0);

    const cryptoAssets = state.crypto.reduce((sum, c) => {
      const priceUSD = c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
      return sum + convertCrypto(c.amount, priceUSD);
    }, 0);

    const assets = bankAssets + cryptoAssets;

    const creditCardDebt = state.accounts
      .filter((a) => a.type === "credit_card")
      .reduce((sum, a) => sum + convert(Math.abs(a.balance), a.currency), 0);

    const personalDebt = state.debts.reduce(
      (sum, d) => sum + convert(d.amount, d.currency),
      0
    );

    const pendingIncoming = state.incomings
      .filter((i) => i.status === "pending")
      .reduce((sum, i) => sum + convert(i.amount, i.currency), 0);

    // Annual costs: recurring monthly expenses * 12 + one-off expenses + pro-rated annual subscriptions
    const latestBudget = [...state.budgets].sort((a, b) => b.month.localeCompare(a.month))[0];
    const expenseItems = latestBudget?.lineItems.filter((li) => li.category === "expense") ?? [];

    const monthlyExpenses = expenseItems
      .filter((li) => li.recurring)
      .reduce((sum, li) => sum + convert(li.amount, li.currency), 0);

    const oneOffExpenses = expenseItems
      .filter((li) => !li.recurring)
      .reduce((sum, li) => sum + convert(li.amount, li.currency), 0);

    const rentItem = latestBudget?.lineItems.find(
      (li) => li.category === "expense" && li.recurring && li.label.toLowerCase() === "rent"
    );
    const monthlyRent = rentItem ? convert(rentItem.amount, rentItem.currency) : 0;

    const annualSubCosts = state.annualSubscriptions.reduce(
      (sum, s) => sum + convert(yearlyAmount(s), s.currency), 0
    );

    const annualCosts = monthlyExpenses * 12 + oneOffExpenses + annualSubCosts;

    return {
      assets,
      debts: creditCardDebt + personalDebt,
      cash: bankAssets,
      creditCards: creditCardDebt,
      pendingIncoming,
      annualCosts,
      monthlyExpenses,
      oneOffExpenses,
      annualSubCosts,
      monthlyRent,
    };
  }, [state, rates, convert, convertCrypto]);

  if (!isLoaded) {
    return <div className="text-sm text-zinc-400">Loading...</div>;
  }

  const netDebt = Math.max(0, summary.debts - summary.pendingIncoming);
  const netWorth = summary.assets - netDebt;
  const hasData =
    state.accounts.length > 0 ||
    state.debts.length > 0 ||
    state.crypto.length > 0 ||
    state.incomings.length > 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Net Worth" value={netWorth} currency={displayCurrency} />
        <SummaryCard label="Total Assets" value={summary.assets} currency={displayCurrency} />
        <SummaryCard label="Total Debts" value={-summary.debts} currency={displayCurrency} />
        <SummaryCard label="Pending Incoming" value={summary.pendingIncoming} currency={displayCurrency} colorOverride="text-amber-600" />
        <SummaryCard label="Net Debt" value={-netDebt} currency={displayCurrency} />
        <SummaryCard label="Annual Costs" value={-summary.annualCosts} currency={displayCurrency} />
      </div>

      <NetWorthBar
        assets={summary.assets}
        debts={summary.debts}
        pendingIncoming={summary.pendingIncoming}
        currency={displayCurrency}
      />

      {summary.annualCosts > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Annual Costs Breakdown
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <Link href="/budget" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">Recurring x 12</Link>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(summary.monthlyExpenses * 12, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400">{formatMoney(summary.monthlyExpenses, displayCurrency)}/mo</div>
            </div>
            {summary.oneOffExpenses > 0 && (
              <div>
                <Link href="/budget" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">One-off Expenses</Link>
                <div className="font-mono text-sm font-semibold text-zinc-900">
                  {formatMoney(summary.oneOffExpenses, displayCurrency)}
                </div>
                <div className="text-xs text-zinc-400">not annualized</div>
              </div>
            )}
            {summary.monthlyRent > 0 && (
              <div>
                <Link href="/budget" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">Rent</Link>
                <div className="font-mono text-sm font-semibold text-zinc-900">
                  {formatMoney(summary.monthlyRent * 12, displayCurrency)}
                </div>
                <div className="text-xs text-zinc-400">{formatMoney(summary.monthlyRent, displayCurrency)}/mo</div>
              </div>
            )}
            <div>
              <Link href="/annual" className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">Annual Subscriptions</Link>
              <div className="font-mono text-sm font-semibold text-zinc-900">
                {formatMoney(summary.annualSubCosts, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400">{state.annualSubscriptions.length} subscriptions</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Total Annual</div>
              <div className="font-mono text-sm font-semibold text-negative">
                {formatMoney(summary.annualCosts, displayCurrency)}
              </div>
              <div className="text-xs text-zinc-400">{formatMoney(summary.annualCosts / 12, displayCurrency)}/mo avg</div>
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Breakdown</h2>
          <div className="overflow-x-auto">
          <table className="sheet">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Currency</th>
                <th style={{ textAlign: "right" }}>Native Amount</th>
                <th style={{ textAlign: "right" }}>
                  In {displayCurrency}
                </th>
              </tr>
            </thead>
            <tbody>
              {state.accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>
                    <span className="text-xs text-zinc-500">
                      {a.type === "bank" ? "Bank" : "Credit Card"}
                    </span>
                  </td>
                  <td><CurrencyBadge currency={a.currency} /></td>
                  <td className="num">
                    {formatMoney(
                      a.type === "credit_card" ? -Math.abs(a.balance) : a.balance,
                      a.currency
                    )}
                  </td>
                  <td className="num">
                    {formatMoney(
                      a.type === "credit_card"
                        ? -convert(Math.abs(a.balance), a.currency)
                        : convert(a.balance, a.currency),
                      displayCurrency
                    )}
                  </td>
                </tr>
              ))}
              {state.debts.map((d) => (
                <tr key={d.id}>
                  <td>{d.creditor}</td>
                  <td>
                    <span className="text-xs text-zinc-500">Debt</span>
                  </td>
                  <td><CurrencyBadge currency={d.currency} /></td>
                  <td className="num">
                    {formatMoney(-d.amount, d.currency)}
                  </td>
                  <td className="num">
                    {formatMoney(
                      -convert(d.amount, d.currency),
                      displayCurrency
                    )}
                  </td>
                </tr>
              ))}
              {state.incomings
                .filter((i) => i.status === "pending")
                .map((i) => (
                  <tr key={i.id}>
                    <td>{i.source}</td>
                    <td>
                      <span className="text-xs text-amber-600">Pending Incoming</span>
                    </td>
                    <td><CurrencyBadge currency={i.currency} /></td>
                    <td className="num">
                      {formatMoney(i.amount, i.currency)}
                    </td>
                    <td className="num">
                      {formatMoney(
                        convert(i.amount, i.currency),
                        displayCurrency
                      )}
                    </td>
                  </tr>
                ))}
              {rates &&
                state.crypto.map((c) => {
                  const priceUSD =
                    c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
                  return (
                    <tr key={c.id}>
                      <td>{c.asset}</td>
                      <td>
                        <span className="text-xs text-zinc-500">Crypto</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-600">
                          {c.asset}
                        </span>
                      </td>
                      <td className="num">
                        {c.amount.toFixed(c.asset === "ETH" ? 4 : 2)} {c.asset}
                      </td>
                      <td className="num">
                        {formatMoney(
                          convertCrypto(c.amount, priceUSD),
                          displayCurrency
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="mt-8 text-center text-sm text-zinc-400">
          Add accounts, debts, or crypto holdings to see your financial overview.
        </div>
      )}
    </div>
  );
}
