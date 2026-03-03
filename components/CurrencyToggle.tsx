"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/constants";
import type { Currency } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  return (
    <ToggleGroup
      type="single"
      value={displayCurrency}
      onValueChange={(v) => v && setDisplayCurrency(v as Currency)}
      className="gap-0.5"
    >
      {CURRENCIES.map((c: Currency) => (
        <ToggleGroupItem
          key={c}
          value={c}
          className="font-mono text-xs px-2.5 py-1 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {c}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
