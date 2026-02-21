"use client";

import { formatMoney, formatPercent } from "@/lib/format";
import type { Currency } from "@/lib/types";

interface NetWorthBarProps {
  assets: number;
  debts: number;
  pendingIncoming: number;
  currency: Currency;
}

export default function NetWorthBar({ assets, debts, pendingIncoming, currency }: NetWorthBarProps) {
  if (debts === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
          Debt Payoff
        </div>
        <div className="text-sm text-zinc-400">No debts</div>
      </div>
    );
  }

  // Each segment as % of total debt (capped so they don't exceed 100% combined)
  const assetPct = Math.min((assets / debts) * 100, 100);
  const incomingPct = Math.min((pendingIncoming / debts) * 100, 100 - assetPct);
  const coveredPct = assetPct + incomingPct;
  const uncoveredPct = 100 - coveredPct;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
        Debt Payoff
      </div>
      <div className="flex h-8 w-full overflow-hidden rounded">
        {assetPct > 0 && (
          <div
            className="flex items-center justify-center bg-green-500 text-white text-xs font-mono font-medium"
            style={{ width: `${assetPct}%` }}
          >
            {assetPct > 12 && formatMoney(assets, currency)}
          </div>
        )}
        {incomingPct > 0 && (
          <div
            className="flex items-center justify-center bg-amber-500 text-white text-xs font-mono font-medium"
            style={{ width: `${incomingPct}%` }}
          >
            {incomingPct > 12 && formatMoney(pendingIncoming, currency)}
          </div>
        )}
        {uncoveredPct > 0 && (
          <div
            className="flex items-center justify-center bg-red-500 text-white text-xs font-mono font-medium"
            style={{ width: `${uncoveredPct}%` }}
          >
            {uncoveredPct > 12 && formatMoney(debts - assets - pendingIncoming, currency)}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="text-green-600">Assets: {formatMoney(assets, currency)} ({formatPercent(assets / debts)})</span>
        {pendingIncoming > 0 && (
          <span className="text-amber-600">Pending: {formatMoney(pendingIncoming, currency)} ({formatPercent(pendingIncoming / debts)})</span>
        )}
        <span className="text-red-600">
          {coveredPct >= 100
            ? "Fully covered"
            : `Uncovered: ${formatMoney(debts - assets - pendingIncoming, currency)} (${formatPercent((debts - assets - pendingIncoming) / debts)})`}
        </span>
      </div>
    </div>
  );
}
