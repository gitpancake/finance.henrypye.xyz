import type { Currency, ExchangeRates, NFTPortfolio } from "./types";

const KEYS = {
  rates: "finance-rates",
  currency: "finance-display-currency",
  nftPortfolio: "finance-nft-portfolio",
} as const;

const NFT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

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

export function loadNFTPortfolio(): NFTPortfolio | null {
  try {
    const raw = localStorage.getItem(KEYS.nftPortfolio);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NFTPortfolio;
    // Migrate old cache that didn't have collections map
    if (!parsed.collections) parsed.collections = {};
    // Migrate old bestOffer shape to new offers[] shape
    for (const info of Object.values(parsed.collections)) {
      if (!Array.isArray(info.offers)) {
        const old = info as unknown as Record<string, unknown>;
        const bestOffer = old.bestOffer as { price?: number } | null | undefined;
        info.offers = [];
        info.bestOfferPrice = bestOffer?.price ?? null;
        delete old.bestOffer;
      }
    }
    // Clear stale per-NFT bestOffer values from old broken code so Phase 3 re-evaluates
    for (const nft of parsed.nfts) {
      if (nft.bestOffer && !nft.bestOffer.isItemOffer) {
        delete nft.bestOffer;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveNFTPortfolio(portfolio: NFTPortfolio): void {
  try {
    localStorage.setItem(KEYS.nftPortfolio, JSON.stringify(portfolio));
  } catch {
    // localStorage full or unavailable
  }
}

export function isNFTPortfolioFresh(): boolean {
  const portfolio = loadNFTPortfolio();
  if (!portfolio?.lastUpdated) return false;
  return Date.now() - new Date(portfolio.lastUpdated).getTime() < NFT_CACHE_TTL;
}
