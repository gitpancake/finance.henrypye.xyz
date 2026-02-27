"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatMoney, formatCrypto } from "@/lib/format";
import { loadNFTPortfolio, saveNFTPortfolio, isNFTPortfolioFresh } from "@/lib/storage";
import type { CryptoHolding, NFTPortfolio, CollectionInfo, CollectionOffer, OfferInfo } from "@/lib/types";

interface WalletBalance {
  address: string;
  label: string;
  chain: string;
  ethBalance: number;
  usdcBalance: number;
  gbpeBalance: number;
}

function calculateTopNOfferValue(offers: CollectionOffer[], nftsHeld: number): number {
  let remaining = nftsHeld;
  let total = 0;
  for (const offer of offers) {
    if (remaining <= 0) break;
    const canFill = Math.min(remaining, offer.remainingQuantity);
    total += canFill * offer.price;
    remaining -= canFill;
  }
  return total;
}

export default function CryptoPage() {
  const { state, dispatch, isLoaded } = useFinance();
  const { displayCurrency, convert, convertCrypto, rates } = useCurrency();

  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const balancesFetched = useRef(false);

  const [nftPortfolio, setNftPortfolio] = useState<NFTPortfolio | null>(null);
  const [nftLoading, setNftLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [nftOffersLoading, setNftOffersLoading] = useState(false);
  const [nftOffersProgress, setNftOffersProgress] = useState({ done: 0, total: 0 });
  const [nftError, setNftError] = useState<string | null>(null);
  const portfolioRef = useRef<NFTPortfolio | null>(null);

  /** Helper: update portfolio ref, state, and cache */
  const updatePortfolio = useCallback((updated: NFTPortfolio) => {
    portfolioRef.current = updated;
    setNftPortfolio(updated);
    saveNFTPortfolio(updated);
  }, []);

  /** Fetch wallet balances and update state.crypto */
  const fetchBalances = useCallback(async () => {
    if (state.walletAddresses.length === 0) return;
    setBalancesLoading(true);
    try {
      const res = await fetch("/api/wallets/balances");
      if (!res.ok) return;
      const data: { wallets: WalletBalance[] } = await res.json();
      setWalletBalances(data.wallets);

      // Aggregate totals across all wallets
      const totalETH = data.wallets.reduce((sum, w) => sum + w.ethBalance, 0);
      const totalUSDC = data.wallets.reduce((sum, w) => sum + w.usdcBalance, 0);
      const totalGBPE = data.wallets.reduce((sum, w) => sum + w.gbpeBalance, 0);

      // Deterministic UUIDs for wallet-derived holdings
      const ETH_UUID = "00000000-0000-4000-a000-000000000001";
      const USDC_UUID = "00000000-0000-4000-a000-000000000002";
      const GBPE_UUID = "00000000-0000-4000-a000-000000000003";

      const holdings: CryptoHolding[] = [];
      if (totalETH > 0) {
        holdings.push({ id: ETH_UUID, asset: "ETH", amount: totalETH, sortOrder: 0 });
      }
      if (totalUSDC > 0) {
        holdings.push({ id: USDC_UUID, asset: "USDC", amount: totalUSDC, sortOrder: 1 });
      }
      if (totalGBPE > 0) {
        holdings.push({ id: GBPE_UUID, asset: "GBP-E", amount: totalGBPE, sortOrder: 2 });
      }
      dispatch({ type: "SET_CRYPTO", payload: holdings });
    } catch (err) {
      console.error("Failed to fetch wallet balances:", err);
    } finally {
      setBalancesLoading(false);
    }
  }, [state.walletAddresses.length, dispatch]);

  // Fetch balances on mount (once)
  useEffect(() => {
    if (!isLoaded || balancesFetched.current) return;
    if (state.walletAddresses.length > 0) {
      balancesFetched.current = true;
      fetchBalances();
    }
  }, [isLoaded, state.walletAddresses.length, fetchBalances]);

  /**
   * Phase 2: Stream collection info (name, floor price, all offers) — all in one pass.
   */
  const streamCollections = useCallback(async (portfolio: NFTPortfolio) => {
    const slugs = [...new Set(portfolio.nfts.map((n) => n.collection).filter(Boolean))];
    const existingCollections = portfolio.collections ?? {};
    const missingSlugs = slugs.filter((s) => !existingCollections[s]);
    if (missingSlugs.length === 0) return;

    setCollectionsLoading(true);
    try {
      const res = await fetch(`/api/nfts/collections?slugs=${missingSlugs.join(",")}`);
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const info: CollectionInfo = JSON.parse(line);

          const current = portfolioRef.current;
          if (!current) continue;

          const updatedCollections = { ...current.collections, [info.slug]: info };
          const updatedNfts = current.nfts.map((nft) =>
            nft.collection === info.slug
              ? { ...nft, collectionName: info.name, floorPrice: info.floorPrice }
              : nft
          );
          updatePortfolio({ ...current, nfts: updatedNfts, collections: updatedCollections });
        }
      }
    } catch (err) {
      console.error("Failed to stream collections:", err);
    } finally {
      setCollectionsLoading(false);
    }
  }, [updatePortfolio]);

  /**
   * Phase 3: Stream per-NFT best offers.
   */
  const streamNFTOffers = useCallback(async (portfolio: NFTPortfolio) => {
    const nftKeys = portfolio.nfts
      .filter((n) => n.collection && n.bestOffer === undefined)
      .map((n) => `${n.collection}:${n.identifier}`);

    if (nftKeys.length === 0) return;

    setNftOffersLoading(true);
    setNftOffersProgress({ done: 0, total: nftKeys.length });
    let done = 0;
    try {
      const res = await fetch(`/api/nfts/offers?nfts=${nftKeys.join(",")}`);
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data: { slug: string; identifier: string; offer: OfferInfo | null } = JSON.parse(line);

          const current = portfolioRef.current;
          if (!current) continue;

          // Compare against collection best offer to detect item-specific bids.
          let resolvedOffer = data.offer;
          if (resolvedOffer) {
            const collBestPrice = current.collections[data.slug]?.bestOfferPrice ?? 0;
            if (resolvedOffer.price > collBestPrice && collBestPrice > 0) {
              resolvedOffer = { ...resolvedOffer, isItemOffer: true };
            } else {
              resolvedOffer = null;
            }
          }

          const updatedNfts = current.nfts.map((nft) =>
            nft.collection === data.slug && nft.identifier === data.identifier
              ? { ...nft, bestOffer: resolvedOffer }
              : nft
          );
          updatePortfolio({ ...current, nfts: updatedNfts });
          done++;
          setNftOffersProgress({ done, total: nftKeys.length });
        }
      }
    } catch (err) {
      console.error("Failed to stream NFT offers:", err);
    } finally {
      setNftOffersLoading(false);
    }
  }, [updatePortfolio]);

  const [refreshingSlug, setRefreshingSlug] = useState<string | null>(null);

  /** Refresh offers for a single collection (Phase 2 + Phase 3 for that slug only). */
  const refreshCollectionOffers = useCallback(async (slug: string) => {
    const current = portfolioRef.current;
    if (!current) return;

    setRefreshingSlug(slug);
    try {
      // Clear existing offers for this collection
      const cleared: NFTPortfolio = {
        ...current,
        nfts: current.nfts.map((nft) =>
          nft.collection === slug
            ? { ...nft, bestOffer: undefined } as typeof nft
            : nft
        ),
        collections: {
          ...current.collections,
          [slug]: { ...current.collections[slug], offers: [], bestOfferPrice: null },
        },
      };
      updatePortfolio(cleared);

      // Phase 2: Re-fetch collection info
      const collRes = await fetch(`/api/nfts/collections?slugs=${slug}`);
      if (collRes.ok && collRes.body) {
        const reader = collRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const info: CollectionInfo = JSON.parse(line);
            const cur = portfolioRef.current;
            if (!cur) continue;
            const updatedCollections = { ...cur.collections, [info.slug]: info };
            const updatedNfts = cur.nfts.map((nft) =>
              nft.collection === info.slug
                ? { ...nft, collectionName: info.name, floorPrice: info.floorPrice }
                : nft
            );
            updatePortfolio({ ...cur, nfts: updatedNfts, collections: updatedCollections });
          }
        }
      }

      // Phase 3: Re-fetch per-NFT offers for this collection
      const cur = portfolioRef.current;
      if (!cur) return;
      const nftKeys = cur.nfts
        .filter((n) => n.collection === slug)
        .map((n) => `${n.collection}:${n.identifier}`);

      if (nftKeys.length > 0) {
        const offersRes = await fetch(`/api/nfts/offers?nfts=${nftKeys.join(",")}`);
        if (offersRes.ok && offersRes.body) {
          const reader = offersRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              const data: { slug: string; identifier: string; offer: OfferInfo | null } = JSON.parse(line);
              const cur2 = portfolioRef.current;
              if (!cur2) continue;
              let resolvedOffer = data.offer;
              if (resolvedOffer) {
                const collBestPrice = cur2.collections[data.slug]?.bestOfferPrice ?? 0;
                if (resolvedOffer.price > collBestPrice && collBestPrice > 0) {
                  resolvedOffer = { ...resolvedOffer, isItemOffer: true };
                } else {
                  resolvedOffer = null;
                }
              }
              const updatedNfts = cur2.nfts.map((nft) =>
                nft.collection === data.slug && nft.identifier === data.identifier
                  ? { ...nft, bestOffer: resolvedOffer }
                  : nft
              );
              updatePortfolio({ ...cur2, nfts: updatedNfts });
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to refresh offers for ${slug}:`, err);
    } finally {
      setRefreshingSlug(null);
    }
  }, [updatePortfolio]);

  const refreshOffers = useCallback(async () => {
    const current = portfolioRef.current;
    if (!current) return;

    const cleared: NFTPortfolio = {
      ...current,
      nfts: current.nfts.map((nft) => {
        const { bestOffer, ...rest } = nft;
        return rest as typeof nft;
      }),
      collections: Object.fromEntries(
        Object.entries(current.collections).map(([slug, info]) => [
          slug,
          { ...info, offers: [], bestOfferPrice: null },
        ])
      ),
    };
    updatePortfolio(cleared);

    const forStreaming: NFTPortfolio = { ...cleared, collections: {} };
    await streamCollections(forStreaming);
    await streamNFTOffers(portfolioRef.current!);
  }, [updatePortfolio, streamCollections, streamNFTOffers]);

  const fetchNFTs = useCallback(async (force = false) => {
    if (!force && isNFTPortfolioFresh()) {
      const cached = loadNFTPortfolio();
      if (cached) {
        portfolioRef.current = cached;
        setNftPortfolio(cached);
        return;
      }
    }

    setNftLoading(true);
    setNftError(null);
    try {
      const res = await fetch("/api/nfts");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch NFTs");
      }
      const data: { nfts: NFTPortfolio["nfts"]; lastUpdated: string } = await res.json();
      const portfolio: NFTPortfolio = {
        nfts: data.nfts,
        collections: {},
        lastUpdated: data.lastUpdated,
      };

      updatePortfolio(portfolio);
      setNftLoading(false);

      await streamCollections(portfolio);
      await streamNFTOffers(portfolioRef.current!);
    } catch (err) {
      setNftError(err instanceof Error ? err.message : "Failed to fetch NFTs");
      setNftLoading(false);
    }
  }, [streamCollections, streamNFTOffers, updatePortfolio]);

  useEffect(() => {
    if (!isLoaded) return;
    if (state.walletAddresses.length > 0) {
      const cached = loadNFTPortfolio();
      if (cached) {
        portfolioRef.current = cached;
        setNftPortfolio(cached);
        if (!isNFTPortfolioFresh()) {
          fetchNFTs();
        } else {
          (async () => {
            await streamCollections(cached);
            await streamNFTOffers(portfolioRef.current!);
          })();
        }
      } else {
        fetchNFTs();
      }
    }
  }, [isLoaded, state.walletAddresses.length, fetchNFTs, streamCollections, streamNFTOffers]);

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  const total = rates
    ? state.crypto.reduce((sum, c) => {
        if (c.asset === "GBP-E") return sum + convert(c.amount, "GBP");
        const priceUSD = c.asset === "ETH" ? rates.ETH_USD : rates.USDC_USD;
        return sum + convertCrypto(c.amount, priceUSD);
      }, 0)
    : 0;

  // NFT calculations
  const nfts = nftPortfolio?.nfts ?? [];
  const collections = nftPortfolio?.collections ?? {};
  const nftsByCollection = new Map<string, typeof nfts>();
  for (const nft of nfts) {
    const key = nft.collection || "unknown";
    if (!nftsByCollection.has(key)) nftsByCollection.set(key, []);
    nftsByCollection.get(key)!.push(nft);
  }

  const totalNFTFloorETH = nfts.reduce((sum, n) => sum + (n.floorPrice ?? 0), 0);
  const totalNFTFloorDisplay = rates
    ? convertCrypto(totalNFTFloorETH, rates.ETH_USD)
    : 0;

  const totalOffersETH = Array.from(nftsByCollection.entries()).reduce((sum, [slug, items]) => {
    const itemOfferTotal = items.reduce(
      (s, nft) => s + (nft.bestOffer?.isItemOffer ? nft.bestOffer.price : 0), 0
    );
    const itemsWithBids = items.filter((nft) => nft.bestOffer?.isItemOffer).length;

    const collOffers = collections[slug]?.offers ?? [];
    const remainingCount = items.length - itemsWithBids;
    const collectionOfferTotal = remainingCount > 0
      ? calculateTopNOfferValue(collOffers, remainingCount)
      : 0;

    return sum + itemOfferTotal + collectionOfferTotal;
  }, 0);
  const totalOffersDisplay = rates ? convertCrypto(totalOffersETH, rates.ETH_USD) : 0;

  const collectionsResolved = Object.keys(collections).length;
  const collectionsTotal = nftsByCollection.size;
  const isEnriching = collectionsLoading || nftOffersLoading;

  const totalETH = walletBalances.reduce((sum, w) => sum + w.ethBalance, 0);
  const totalUSDC = walletBalances.reduce((sum, w) => sum + w.usdcBalance, 0);
  const totalGBPE = walletBalances.reduce((sum, w) => sum + w.gbpeBalance, 0);

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Crypto Holdings</h1>

      {/* Wallet Balances */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Wallet Balances
          </div>
          {state.walletAddresses.length > 0 && (
            <button
              onClick={fetchBalances}
              disabled={balancesLoading}
              className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded hover:bg-zinc-200 disabled:opacity-50"
            >
              {balancesLoading ? "Loading..." : "Refresh"}
            </button>
          )}
        </div>

        {state.walletAddresses.length === 0 ? (
          <div className="text-sm text-zinc-400 text-center py-4">
            <p className="mb-2">No wallet addresses configured.</p>
            <Link href="/settings" className="text-xs text-zinc-600 hover:text-zinc-900 underline">
              Add wallet addresses in Settings
            </Link>
          </div>
        ) : walletBalances.length === 0 && !balancesLoading ? (
          <div className="text-sm text-zinc-400 text-center py-4">
            Click refresh to fetch wallet balances.
          </div>
        ) : (
          <>
            <table className="sheet">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th style={{ textAlign: "right" }}>ETH</th>
                  <th style={{ textAlign: "right" }}>USDC</th>
                  <th style={{ textAlign: "right" }}>GBP-E</th>
                  {rates && (
                    <th style={{ textAlign: "right" }}>Value ({displayCurrency})</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {walletBalances.map((w) => {
                  const ethValue = rates ? convertCrypto(w.ethBalance, rates.ETH_USD) : 0;
                  const usdcValue = rates ? convertCrypto(w.usdcBalance, rates.USDC_USD) : 0;
                  const gbpeValue = rates ? convert(w.gbpeBalance, "GBP") : 0;
                  return (
                    <tr key={w.address}>
                      <td>
                        <div className="text-sm font-medium">{w.label}</div>
                        <div className="text-xs text-zinc-400 font-mono">{w.address.slice(0, 6)}...{w.address.slice(-4)}</div>
                      </td>
                      <td className="num">{formatCrypto(w.ethBalance)}</td>
                      <td className="num">{formatCrypto(w.usdcBalance)}</td>
                      <td className="num">{w.gbpeBalance.toFixed(2)}</td>
                      {rates && (
                        <td className="num">{formatMoney(ethValue + usdcValue + gbpeValue, displayCurrency)}</td>
                      )}
                    </tr>
                  );
                })}
                {walletBalances.length > 1 && (
                  <tr className="font-semibold">
                    <td>Total</td>
                    <td className="num">{formatCrypto(totalETH)}</td>
                    <td className="num">{formatCrypto(totalUSDC)}</td>
                    <td className="num">{totalGBPE.toFixed(2)}</td>
                    {rates && (
                      <td className="num">{formatMoney(total, displayCurrency)}</td>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
            {walletBalances.length <= 1 && rates && total > 0 && (
              <div className="mt-3 text-right text-sm font-mono text-zinc-600">
                Total: {formatMoney(total, displayCurrency)}
              </div>
            )}
          </>
        )}
      </div>

      {/* NFT Portfolio Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700">NFT Portfolio</h2>
          {state.walletAddresses.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={refreshOffers}
                disabled={isEnriching || nftLoading}
                className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded hover:bg-amber-100 disabled:opacity-50"
              >
                {isEnriching ? "Loading..." : "Refresh Offers"}
              </button>
              <button
                onClick={() => fetchNFTs(true)}
                disabled={nftLoading}
                className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded hover:bg-zinc-200 disabled:opacity-50"
              >
                {nftLoading ? "Loading..." : "Refresh All"}
              </button>
            </div>
          )}
        </div>

        {state.walletAddresses.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
            <p className="text-sm text-zinc-400 mb-2">
              No wallet addresses configured.
            </p>
            <Link href="/settings" className="text-xs text-zinc-600 hover:text-zinc-900 underline">
              Add wallet addresses in Settings
            </Link>
          </div>
        ) : (
          <>
            {nftError && (
              <div className="text-xs text-red-500 mb-3">{nftError}</div>
            )}

            {nftLoading && !nftPortfolio && (
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-sm text-zinc-400">Fetching NFTs from OpenSea...</p>
              </div>
            )}

            {nftPortfolio && nfts.length === 0 && !nftLoading && (
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-sm text-zinc-400">No NFTs found in your wallets.</p>
              </div>
            )}

            {nfts.length > 0 && (
              <>
                {/* Summary */}
                <div className="rounded-lg border border-zinc-200 bg-white p-5 mb-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
                    NFT Summary
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500">Total NFTs</div>
                      <div className="font-mono text-lg font-semibold text-zinc-900">
                        {nfts.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Floor Value (ETH)</div>
                      <div className="font-mono text-lg font-semibold text-zinc-900">
                        {formatCrypto(totalNFTFloorETH)} ETH
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Floor Value ({displayCurrency})</div>
                      <div className="font-mono text-lg font-semibold text-zinc-900">
                        {formatMoney(totalNFTFloorDisplay, displayCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Best Offers (ETH)</div>
                      <div className="font-mono text-lg font-semibold text-amber-600">
                        {collectionsLoading && totalOffersETH === 0 ? (
                          <span className="text-zinc-300 font-normal text-base">loading...</span>
                        ) : (
                          <>{formatCrypto(totalOffersETH)} ETH</>
                        )}
                      </div>
                      {totalOffersDisplay > 0 && rates && (
                        <div className="font-mono text-xs text-amber-500">
                          {formatMoney(totalOffersDisplay, displayCurrency)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {nftPortfolio?.lastUpdated && (
                      <div className="text-xs text-zinc-300">
                        Last updated: {new Date(nftPortfolio.lastUpdated).toLocaleString()}
                      </div>
                    )}
                    {isEnriching && (
                      <div className="text-xs text-zinc-400">
                        {collectionsLoading
                          ? `Loading collections... ${collectionsResolved}/${collectionsTotal}`
                          : `Loading item offers... ${nftOffersProgress.done}/${nftOffersProgress.total}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* By Collection */}
                <div className="rounded-lg border border-zinc-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">
                    By Collection
                  </div>
                  <div className="space-y-4">
                    {Array.from(nftsByCollection.entries())
                      .sort((a, b) => {
                        const offerVal = ([, items]: [string, typeof nfts]) => {
                          const coll = collections[items[0]?.collection || ""];
                          const itemBids = items.reduce(
                            (s, n) => s + (n.bestOffer?.isItemOffer ? n.bestOffer.price : 0), 0
                          );
                          const withBids = items.filter((n) => n.bestOffer?.isItemOffer).length;
                          const rem = items.length - withBids;
                          const collVal = rem > 0 && coll?.offers
                            ? calculateTopNOfferValue(coll.offers, rem) : 0;
                          return itemBids + collVal;
                        };
                        const diff = offerVal(b) - offerVal(a);
                        if (diff !== 0) return diff;
                        const floorA = a[1].reduce((s, n) => s + (n.floorPrice ?? 0), 0);
                        const floorB = b[1].reduce((s, n) => s + (n.floorPrice ?? 0), 0);
                        return floorB - floorA;
                      })
                      .map(([slug, items]) => {
                        const collectionFloor = items[0]?.floorPrice ?? 0;
                        const collectionName = items[0]?.collectionName || slug;
                        const hasPrice = collectionFloor > 0;
                        const collInfo = collections[slug];
                        const offerCount = collInfo?.offers?.length ?? 0;
                        const isRefreshingThis = refreshingSlug === slug;
                        // Item-specific bids for this collection
                        const itemBidTotal = items.reduce(
                          (s, nft) => s + (nft.bestOffer?.isItemOffer ? nft.bestOffer.price : 0), 0
                        );
                        const itemsWithBids = items.filter((nft) => nft.bestOffer?.isItemOffer).length;
                        const remainingCount = items.length - itemsWithBids;
                        const collOfferTotal = remainingCount > 0 && collInfo?.offers
                          ? calculateTopNOfferValue(collInfo.offers, remainingCount)
                          : 0;
                        const collOfferValue = itemBidTotal + collOfferTotal;
                        return (
                          <div key={slug}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-zinc-700">
                                  {collectionName}
                                  <span className="text-xs text-zinc-400 ml-1.5">
                                    {items.length} item{items.length !== 1 && "s"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => refreshCollectionOffers(slug)}
                                  disabled={isRefreshingThis || isEnriching}
                                  className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded hover:bg-amber-100 disabled:opacity-50"
                                  title="Refresh offers for this collection"
                                >
                                  {isRefreshingThis ? "..." : "↻"}
                                </button>
                              </div>
                              <div className="text-right">
                                {hasPrice || collOfferValue > 0 ? (
                                  <>
                                    {collOfferValue > 0 && (
                                      <>
                                        <div className="font-mono text-sm font-semibold text-amber-600">
                                          {formatCrypto(collOfferValue)} ETH
                                        </div>
                                        {rates && (
                                          <div className="font-mono text-xs text-amber-500">
                                            {formatMoney(convertCrypto(collOfferValue, rates.ETH_USD), displayCurrency)}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {hasPrice && (
                                      <div className="text-xs text-zinc-400">
                                        Floor: {formatCrypto(collectionFloor)} ETH
                                        {offerCount > 0 && ` · ${offerCount} offer${offerCount !== 1 ? "s" : ""}`}
                                      </div>
                                    )}
                                  </>
                                ) : collectionsLoading ? (
                                  <div className="text-xs text-zinc-300">loading...</div>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {items.map((nft) => (
                                <div
                                  key={`${nft.contractAddress}:${nft.identifier}`}
                                  className="flex items-center gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5"
                                >
                                  {nft.imageUrl && (
                                    <img
                                      src={nft.imageUrl}
                                      alt={nft.name}
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <span className="text-xs text-zinc-600 max-w-[120px] truncate block">
                                      {nft.name}
                                    </span>
                                    {nft.bestOffer && (
                                      <span className={`text-[10px] font-mono ${
                                        nft.bestOffer.isItemOffer
                                          ? "text-green-600 font-semibold"
                                          : "text-amber-600"
                                      }`}>
                                        {nft.bestOffer.isItemOffer ? "BID " : ""}
                                        {formatCrypto(nft.bestOffer.price)} ETH
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
