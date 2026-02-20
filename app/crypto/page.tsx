"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatMoney, formatCrypto } from "@/lib/format";
import type { CryptoAsset, CryptoHolding } from "@/lib/types";
import { useState } from "react";

const ASSETS: CryptoAsset[] = ["ETH", "USDC"];

export default function CryptoPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convertCrypto, rates } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState<CryptoAsset>("ETH");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const handleAdd = () => {
    const holding: CryptoHolding = {
      id: crypto.randomUUID(),
      asset: newAsset,
      amount: parseFloat(newAmount) || 0,
    };
    dispatch({ type: "ADD_CRYPTO", payload: holding });
    setNewAmount("");
    setShowAdd(false);
  };

  const handleUpdate = (id: string) => {
    const existing = state.crypto.find((c) => c.id === id);
    if (!existing) return;
    dispatch({
      type: "UPDATE_CRYPTO",
      payload: { ...existing, amount: parseFloat(editAmount) || 0 },
    });
    setEditingId(null);
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

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-700">Holdings</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900"
          >
            + Add
          </button>
        )}
      </div>

      <table className="sheet">
        <thead>
          <tr>
            <th>Asset</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th style={{ textAlign: "right" }}>Price (USD)</th>
            <th style={{ textAlign: "right" }}>Value ({displayCurrency})</th>
            <th style={{ width: "80px" }}></th>
          </tr>
        </thead>
        <tbody>
          {state.crypto.map((c) => {
            const priceUSD =
              rates
                ? c.asset === "ETH"
                  ? rates.ETH_USD
                  : rates.USDC_USD
                : 0;
            const value = rates ? convertCrypto(c.amount, priceUSD) : 0;
            const isEditing = editingId === c.id;

            return (
              <tr key={c.id} className="group">
                <td>
                  <span className="font-mono font-medium">{c.asset}</span>
                </td>
                <td className="num">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      step="0.0001"
                    />
                  ) : (
                    formatCrypto(c.amount)
                  )}
                </td>
                <td className="num">
                  {formatMoney(priceUSD, "USD")}
                </td>
                <td className="num">{formatMoney(value, displayCurrency)}</td>
                <td className="w-20">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(c.id)}
                          className="text-xs font-medium text-zinc-900 hover:text-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-zinc-400 hover:text-zinc-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditAmount(String(c.amount));
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            dispatch({ type: "DELETE_CRYPTO", payload: c.id })
                          }
                          className="text-xs text-zinc-400 hover:text-red-600"
                        >
                          Del
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {showAdd && (
            <tr className="border-t border-dashed border-zinc-300">
              <td>
                <select
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value as CryptoAsset)}
                  className="border-b border-zinc-300 bg-transparent text-sm outline-none"
                >
                  {ASSETS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </td>
              <td className="num">
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setShowAdd(false);
                  }}
                  placeholder="0.00"
                  autoFocus
                  step="0.0001"
                />
              </td>
              <td></td>
              <td></td>
              <td>
                <div className="flex gap-1">
                  <button
                    onClick={handleAdd}
                    className="text-xs font-medium text-zinc-900 hover:text-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          )}
          {state.crypto.length === 0 && !showAdd && (
            <tr>
              <td colSpan={5} className="text-center text-sm text-zinc-400 py-8">
                No crypto holdings yet.{" "}
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-zinc-600 hover:text-zinc-900 underline"
                >
                  Add one
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {state.crypto.length > 0 && (
        <div className="mt-4 text-right text-sm font-mono text-zinc-600">
          Total: {formatMoney(total, displayCurrency)}
        </div>
      )}
    </div>
  );
}
