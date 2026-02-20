import type { Currency } from "@/lib/types";

const dotColors: Record<Currency, string> = {
  CAD: "bg-red-500",
  USD: "bg-green-500",
  GBP: "bg-blue-500",
  EUR: "bg-yellow-500",
};

export default function CurrencyBadge({ currency }: { currency: Currency }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-600">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColors[currency]}`} />
      {currency}
    </span>
  );
}
