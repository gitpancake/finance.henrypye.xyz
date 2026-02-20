"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Currency, ExchangeRates } from "@/lib/types";
import {
  fetchRates,
  convert as convertFn,
  convertCryptoToFiat as convertCryptoFn,
  isRatesFresh,
} from "@/lib/currency";
import {
  loadRates,
  saveRates,
  loadDisplayCurrency,
  saveDisplayCurrency,
} from "@/lib/storage";

interface CurrencyContextValue {
  rates: ExchangeRates | null;
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  convert: (amount: number, from: Currency, to?: Currency) => number;
  convertCrypto: (amount: number, priceUSD: number, to?: Currency) => number;
  loading: boolean;
  error: string | null;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  rates: null,
  displayCurrency: "CAD",
  setDisplayCurrency: () => {},
  convert: (amount) => amount,
  convertCrypto: () => 0,
  loading: true,
  error: null,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>("CAD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedCurrency = loadDisplayCurrency();
    setDisplayCurrencyState(savedCurrency);

    const cached = loadRates();
    if (cached) {
      setRates(cached);
      setLoading(false);
      if (isRatesFresh(cached)) return;
    }

    fetchRates()
      .then((fresh) => {
        setRates(fresh);
        saveRates(fresh);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch rates");
        if (!cached) setLoading(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const setDisplayCurrency = useCallback((c: Currency) => {
    setDisplayCurrencyState(c);
    saveDisplayCurrency(c);
  }, []);

  const convert = useCallback(
    (amount: number, from: Currency, to?: Currency) => {
      if (!rates) return amount;
      return convertFn(amount, from, to ?? displayCurrency, rates);
    },
    [rates, displayCurrency]
  );

  const convertCrypto = useCallback(
    (amount: number, priceUSD: number, to?: Currency) => {
      if (!rates) return 0;
      return convertCryptoFn(amount, priceUSD, to ?? displayCurrency, rates);
    },
    [rates, displayCurrency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        rates,
        displayCurrency,
        setDisplayCurrency,
        convert,
        convertCrypto,
        loading,
        error,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
