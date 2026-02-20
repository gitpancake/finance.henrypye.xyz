import type { Currency, ExchangeRates } from "./types";

const KEYS = {
  rates: "finance-rates",
  currency: "finance-display-currency",
} as const;

export function loadRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(KEYS.rates);
    if (!raw) return null;
    return JSON.parse(raw) as ExchangeRates;
  } catch {
    return null;
  }
}

export function saveRates(rates: ExchangeRates): void {
  try {
    localStorage.setItem(KEYS.rates, JSON.stringify(rates));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadDisplayCurrency(): Currency {
  try {
    const raw = localStorage.getItem(KEYS.currency);
    if (raw === "CAD" || raw === "USD" || raw === "GBP" || raw === "EUR") return raw;
    return "CAD";
  } catch {
    return "CAD";
  }
}

export function saveDisplayCurrency(c: Currency): void {
  try {
    localStorage.setItem(KEYS.currency, c);
  } catch {
    // localStorage full or unavailable
  }
}
