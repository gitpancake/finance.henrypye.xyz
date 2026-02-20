import type { Currency, ExchangeRates } from "./types";

export async function fetchRates(): Promise<ExchangeRates> {
  const [fiatRes, cryptoRes] = await Promise.all([
    fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cad.json"
    ).catch(() =>
      fetch(
        "https://latest.currency-api.pages.dev/v1/currencies/cad.json"
      )
    ),
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd"
    ),
  ]);

  const fiat = await fiatRes.json();
  const crypto = await cryptoRes.json();

  return {
    CAD: 1 as const,
    USD: fiat.cad.usd,
    GBP: fiat.cad.gbp,
    EUR: fiat.cad.eur,
    ETH_USD: crypto.ethereum?.usd ?? 0,
    USDC_USD: crypto["usd-coin"]?.usd ?? 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates
): number {
  if (from === to) return amount;
  // rates are: 1 CAD = rates[X] of currency X
  // So to convert FROM a currency to CAD: amount / rates[from]
  // Then from CAD to target: * rates[to]
  if (from !== "CAD" && !rates[from]) return amount;
  if (to !== "CAD" && !rates[to]) return amount;
  const inCAD = from === "CAD" ? amount : amount / rates[from];
  return to === "CAD" ? inCAD : inCAD * rates[to];
}

export function convertCryptoToFiat(
  cryptoAmount: number,
  cryptoPriceUSD: number,
  toCurrency: Currency,
  rates: ExchangeRates
): number {
  const usdValue = cryptoAmount * cryptoPriceUSD;
  return convert(usdValue, "USD", toCurrency, rates);
}

const ONE_HOUR = 60 * 60 * 1000;

export function isRatesFresh(rates: ExchangeRates): boolean {
  if (!rates.EUR) return false;
  const age = Date.now() - new Date(rates.lastUpdated).getTime();
  return age < ONE_HOUR;
}
