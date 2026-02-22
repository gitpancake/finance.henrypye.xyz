"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditableTable, { type Column } from "@/components/EditableTable";
import { formatMoney, formatCrypto } from "@/lib/format";
import type { CryptoAsset, CryptoHolding } from "@/lib/types";

const columns: Column[] = [
  { key: "asset", label: "Asset", type: "select", options: ["ETH", "USDC"] },
  { key: "amount", label: "Amount", type: "number" },
];

export default function CryptoPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convertCrypto, rates } = useCurrency();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const handleAdd = (row: Record<string, unknown>) => {
    const holding: CryptoHolding = {
      id: crypto.randomUUID(),
      asset: (row.asset as CryptoAsset) || "ETH",
      amount: Math.abs(Number(row.amount) || 0),
    };
    dispatch({ type: "ADD_CRYPTO", payload: holding });
  };

  const handleUpdate = (row: Record<string, unknown>) => {
    const existing = state.crypto.find((c) => c.id === row.id);
    if (!existing) return;
    const updated: CryptoHolding = {
      ...existing,
      asset: (row.asset as CryptoAsset) || existing.asset,
      amount: Math.abs(Number(row.amount) || 0),
    };
    dispatch({ type: "UPDATE_CRYPTO", payload: updated });
  };

  const total = rates
    ? state.crypto.reduce((sum, c) => {
        const priceUSD = c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
        return sum + convertCrypto(c.amount, priceUSD);
      }, 0)
    : 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Crypto Holdings</h1>

      <EditableTable
        title="Holdings"
        columns={columns}
        rows={state.crypto}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={(id) => dispatch({ type: "DELETE_CRYPTO", payload: id })}
        defaultValues={{ asset: "ETH" }}
      />

      {state.crypto.length > 0 && rates && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
            Valuations
          </div>
          <table className="sheet">
            <thead>
              <tr>
                <th>Asset</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Price (USD)</th>
                <th style={{ textAlign: "right" }}>Value ({displayCurrency})</th>
              </tr>
            </thead>
            <tbody>
              {state.crypto.map((c) => {
                const priceUSD = c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
                const value = convertCrypto(c.amount, priceUSD);
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono font-medium">{c.asset}</span>
                    </td>
                    <td className="num">{formatCrypto(c.amount)}</td>
                    <td className="num">{formatMoney(priceUSD, "USD")}</td>
                    <td className="num">{formatMoney(value, displayCurrency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 text-right text-sm font-mono text-zinc-600">
            Total: {formatMoney(total, displayCurrency)}
          </div>
        </div>
      )}
    </div>
  );
}
