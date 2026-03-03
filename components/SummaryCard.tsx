"use client";

import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  label: string;
  value: number;
  currency: Currency;
  colorOverride?: string;
  subtitle?: string;
}

export default function SummaryCard({ label, value, currency, colorOverride, subtitle }: SummaryCardProps) {
  const color = colorOverride ?? (value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-muted-foreground");

  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-1 font-mono text-lg font-semibold truncate lg:text-xl ${color}`} title={formatMoney(value, currency)}>
          {formatMoney(value, currency)}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
