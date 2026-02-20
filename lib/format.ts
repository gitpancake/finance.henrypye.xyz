import type { Currency } from "./types";
import { CURRENCY_SYMBOLS } from "./constants";

const locales: Record<Currency, string> = {
  CAD: "en-CA",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
};

export function formatMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat(locales[currency], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${formatted}`;
}

export function formatMoneyShort(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  }
  return formatMoney(amount, currency);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatCrypto(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}
