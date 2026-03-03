import type { Currency } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const dotColors: Record<Currency, string> = {
  CAD: "bg-red-500",
  USD: "bg-green-500",
  GBP: "bg-blue-500",
  EUR: "bg-yellow-500",
};

export default function CurrencyBadge({ currency }: { currency: Currency }) {
  return (
    <Badge variant="secondary" className="font-mono gap-1">
      <span className={`inline-block size-1.5 rounded-full ${dotColors[currency]}`} />
      {currency}
    </Badge>
  );
}
