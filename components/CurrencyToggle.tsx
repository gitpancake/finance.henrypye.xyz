"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/constants";
import type { Currency } from "@/lib/types";

export default function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  return (
    <div className="flex gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5">
      {CURRENCIES.map((c: Currency) => (
        <button
          key={c}
          onClick={() => setDisplayCurrency(c)}
          className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
            displayCurrency === c
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
