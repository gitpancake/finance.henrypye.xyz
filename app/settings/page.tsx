"use client";

import { useFinance } from "@/contexts/FinanceContext";
import type { WalletAddress } from "@/lib/types";

export default function SettingsPage() {
  const { state, dispatch, isLoaded } = useFinance();

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const wallets = state.walletAddresses;

  const handleAdd = () => {
    const wallet: WalletAddress = {
      id: crypto.randomUUID(),
      address: "",
      label: "",
      chain: "ethereum",
    };
    dispatch({ type: "ADD_WALLET", payload: wallet });
  };

  const handleUpdate = (id: string, field: keyof WalletAddress, value: string) => {
    const existing = wallets.find((w) => w.id === id);
    if (!existing) return;
    dispatch({ type: "UPDATE_WALLET", payload: { ...existing, [field]: value } });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_WALLET", payload: id });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Settings</h1>
      <p className="text-xs text-zinc-400 mb-6">
        Configure wallet addresses and other preferences.
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Wallet Addresses
          </div>
          <button
            onClick={handleAdd}
            className="text-xs bg-zinc-900 text-white px-2.5 py-1 rounded hover:bg-zinc-700"
          >
            + Add Wallet
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Add your Ethereum wallet addresses to display NFTs on the Crypto page.
        </p>

        {wallets.length === 0 ? (
          <div className="text-sm text-zinc-400 text-center py-6">
            No wallet addresses configured. Add one to start tracking NFTs.
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center gap-3 group">
                <input
                  type="text"
                  value={w.label}
                  onChange={(e) => handleUpdate(w.id, "label", e.target.value)}
                  placeholder="Label (e.g. Main Wallet)"
                  className="flex-shrink-0 w-40 text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <input
                  type="text"
                  value={w.address}
                  onChange={(e) => handleUpdate(w.id, "address", e.target.value)}
                  placeholder="0x..."
                  className="flex-1 text-sm font-mono border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <select
                  value={w.chain}
                  onChange={(e) => handleUpdate(w.id, "chain", e.target.value)}
                  className="flex-shrink-0 text-sm border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="base">Base</option>
                  <option value="polygon">Polygon</option>
                </select>
                <button
                  onClick={() => handleDelete(w.id)}
                  className="text-xs text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
