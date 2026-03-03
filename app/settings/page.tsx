"use client";

import { useFinance } from "@/contexts/FinanceContext";
import type { WalletAddress } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { state, dispatch, isLoaded } = useFinance();

  if (!isLoaded) return <Skeleton className="h-6 w-48" />;

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
      <h1 className="text-lg font-semibold mb-1">Settings</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Configure wallet addresses and other preferences.
      </p>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Wallet Addresses
            </div>
            <Button size="sm" onClick={handleAdd}>
              + Add Wallet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Add your Ethereum wallet addresses to display NFTs on the Crypto page.
          </p>

          {wallets.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No wallet addresses configured. Add one to start tracking NFTs.
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center gap-3 group">
                  <Input
                    type="text"
                    value={w.label}
                    onChange={(e) => handleUpdate(w.id, "label", e.target.value)}
                    placeholder="Label (e.g. Main Wallet)"
                    className="flex-shrink-0 w-40"
                  />
                  <Input
                    type="text"
                    value={w.address}
                    onChange={(e) => handleUpdate(w.id, "address", e.target.value)}
                    placeholder="0x..."
                    className="flex-1 font-mono"
                  />
                  <select
                    value={w.chain}
                    onChange={(e) => handleUpdate(w.id, "chain", e.target.value)}
                    className="flex-shrink-0 text-sm border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="gnosis">Gnosis</option>
                    <option value="base">Base</option>
                    <option value="polygon">Polygon</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(w.id)}
                    className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
