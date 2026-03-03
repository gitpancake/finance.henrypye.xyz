"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import SummaryCard from "@/components/SummaryCard";
import NetWorthBar from "@/components/NetWorthBar";
import CurrencyBadge from "@/components/CurrencyBadge";
import { formatMoney, formatCrypto } from "@/lib/format";
import { yearlyAmount } from "@/lib/subscriptions";
import { loadNFTPortfolio } from "@/lib/storage";
import type { NFTPortfolio, CollectionOffer } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

function calculateTopNOfferValue(offers: CollectionOffer[], nftsHeld: number): number {
  let remaining = nftsHeld;
  let total = 0;
  for (const offer of offers) {
    if (remaining <= 0) break;
    const canFill = Math.min(remaining, offer.remainingQuantity);
    total += canFill * offer.price;
    remaining -= canFill;
  }
  return total;
}

export default function Dashboard() {
  const { state, isLoaded } = useFinance();
  const { displayCurrency, convert, convertCrypto, rates } = useCurrency();

  const [nftCache, setNftCache] = useState<NFTPortfolio | null>(null);
  useEffect(() => {
    setNftCache(loadNFTPortfolio());
  }, []);

  const summary = useMemo(() => {
    if (!rates) return { assets: 0, debts: 0, cash: 0, creditCards: 0, pendingIncoming: 0, annualCosts: 0, monthlyExpenses: 0, oneOffExpenses: 0, annualSubCosts: 0, monthlyRent: 0, nftOfferValue: 0, nftOfferETH: 0 };

    const bankAssets = state.accounts
      .filter((a) => a.type === "bank")
      .reduce((sum, a) => sum + convert(a.balance, a.currency), 0);

    const cryptoAssets = state.crypto.reduce((sum, c) => {
      if (c.asset === "GBP-E") return sum + convert(c.amount, "GBP");
      const priceUSD = c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
      return sum + convertCrypto(c.amount, priceUSD);
    }, 0);

    // NFT value based on best offers (not floor prices)
    const nfts = nftCache?.nfts ?? [];
    const collections = nftCache?.collections ?? {};
    const nftsByCollection = new Map<string, typeof nfts>();
    for (const nft of nfts) {
      const key = nft.collection || "unknown";
      if (!nftsByCollection.has(key)) nftsByCollection.set(key, []);
      nftsByCollection.get(key)!.push(nft);
    }
    const nftOfferETH = Array.from(nftsByCollection.entries()).reduce((sum, [slug, items]) => {
      const itemOfferTotal = items.reduce(
        (s, nft) => s + (nft.bestOffer?.isItemOffer ? nft.bestOffer.price : 0), 0
      );
      const itemsWithBids = items.filter((nft) => nft.bestOffer?.isItemOffer).length;
      const collOffers = collections[slug]?.offers ?? [];
      const remainingCount = items.length - itemsWithBids;
      const collectionOfferTotal = remainingCount > 0
        ? calculateTopNOfferValue(collOffers, remainingCount)
        : 0;
      return sum + itemOfferTotal + collectionOfferTotal;
    }, 0);
    const nftOfferValue = nftOfferETH > 0 ? convertCrypto(nftOfferETH, rates.ETH_USD) : 0;

    const assets = bankAssets + cryptoAssets + nftOfferValue;

    const creditCardDebt = state.accounts
      .filter((a) => a.type === "credit_card")
      .reduce((sum, a) => sum + convert(Math.abs(a.balance), a.currency), 0);

    const personalDebt = state.debts
      .filter((d) => !d.paidOff)
      .reduce((sum, d) => sum + convert(d.amount, d.currency), 0);

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
      nftOfferValue,
      nftOfferETH,
    };
  }, [state, rates, convert, convertCrypto, nftCache]);

  if (!isLoaded) {
    return <Skeleton className="h-6 w-48" />;
  }

  const netDebt = Math.max(0, summary.debts - summary.pendingIncoming);
  const netWorth = summary.assets - netDebt;
  const nftCount = nftCache?.nfts?.length ?? 0;
  const hasData =
    state.accounts.length > 0 ||
    state.debts.length > 0 ||
    state.crypto.length > 0 ||
    state.incomings.length > 0 ||
    nftCount > 0;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Dashboard</h1>

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
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Annual Costs Breakdown
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Recurring x 12</Link>
                <div className="font-mono text-sm font-semibold">
                  {formatMoney(summary.monthlyExpenses * 12, displayCurrency)}
                </div>
                <div className="text-xs text-muted-foreground">{formatMoney(summary.monthlyExpenses, displayCurrency)}/mo</div>
              </div>
              {summary.oneOffExpenses > 0 && (
                <div>
                  <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground hover:underline">One-off Expenses</Link>
                  <div className="font-mono text-sm font-semibold">
                    {formatMoney(summary.oneOffExpenses, displayCurrency)}
                  </div>
                  <div className="text-xs text-muted-foreground">not annualized</div>
                </div>
              )}
              {summary.monthlyRent > 0 && (
                <div>
                  <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Rent</Link>
                  <div className="font-mono text-sm font-semibold">
                    {formatMoney(summary.monthlyRent * 12, displayCurrency)}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatMoney(summary.monthlyRent, displayCurrency)}/mo</div>
                </div>
              )}
              <div>
                <Link href="/annual" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Annual Subscriptions</Link>
                <div className="font-mono text-sm font-semibold">
                  {formatMoney(summary.annualSubCosts, displayCurrency)}
                </div>
                <div className="text-xs text-muted-foreground">{state.annualSubscriptions.length} subscriptions</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Annual</div>
                <div className="font-mono text-sm font-semibold text-negative">
                  {formatMoney(summary.annualCosts, displayCurrency)}
                </div>
                <div className="text-xs text-muted-foreground">{formatMoney(summary.annualCosts / 12, displayCurrency)}/mo avg</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Breakdown</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Item</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Currency</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Native Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">
                  In {displayCurrency}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {a.type === "bank" ? "Bank" : "Credit Card"}
                    </span>
                  </TableCell>
                  <TableCell><CurrencyBadge currency={a.currency} /></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(
                      a.type === "credit_card" ? -Math.abs(a.balance) : a.balance,
                      a.currency
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(
                      a.type === "credit_card"
                        ? -convert(Math.abs(a.balance), a.currency)
                        : convert(a.balance, a.currency),
                      displayCurrency
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {state.debts.filter((d) => !d.paidOff).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.creditor}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">Debt</span>
                  </TableCell>
                  <TableCell><CurrencyBadge currency={d.currency} /></TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(-d.amount, d.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(
                      -convert(d.amount, d.currency),
                      displayCurrency
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {state.incomings
                .filter((i) => i.status === "pending")
                .map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.source}</TableCell>
                    <TableCell>
                      <span className="text-xs text-amber-600">Pending Incoming</span>
                    </TableCell>
                    <TableCell><CurrencyBadge currency={i.currency} /></TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(i.amount, i.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(
                        convert(i.amount, i.currency),
                        displayCurrency
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {rates &&
                state.crypto.map((c) => {
                  const displayValue = c.asset === "GBP-E"
                    ? convert(c.amount, "GBP")
                    : convertCrypto(c.amount, c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{c.asset}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">Crypto</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {c.asset}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {c.amount.toFixed(c.asset === "ETH" ? 4 : 2)} {c.asset}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(displayValue, displayCurrency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              {rates && summary.nftOfferETH > 0 && (
                <TableRow key="nfts">
                  <TableCell>
                    NFTs
                    <span className="text-xs text-muted-foreground ml-1">({nftCount})</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-amber-600">NFT Offers</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                      ETH
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCrypto(summary.nftOfferETH)} ETH
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(summary.nftOfferValue, displayCurrency)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!hasData && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Add accounts, debts, or crypto holdings to see your financial overview.
        </div>
      )}
    </div>
  );
}
