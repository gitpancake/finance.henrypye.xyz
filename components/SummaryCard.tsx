"use client";

import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";

interface SummaryCardProps {
  label: string;
  value: number;
  currency: Currency;
  colorOverride?: string;
}

export default function SummaryCard({ label, value, currency, colorOverride }: SummaryCardProps) {
  const color = colorOverride ?? (value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-zinc-500");

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${color}`}>
        {formatMoney(value, currency)}
      </div>
    </div>
  );
}
