import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { openseaFetch, delay, RATE_LIMIT_DELAY } from "@/lib/opensea";
import type { NFTItem } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Phase 1: Returns NFTs quickly without collection lookups.
 * Floor prices and collection names are fetched separately via /api/nfts/collections.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: wallets, error } = await supabase
    .from("finance_wallet_addresses")
    .select("*")
    .eq("user_id", session.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!wallets || wallets.length === 0) {
    return Response.json({ nfts: [], lastUpdated: new Date().toISOString() });
  }

  const allNfts: NFTItem[] = [];
  const seenKeys = new Set<string>();

  for (const wallet of wallets) {
    const chain = wallet.chain || "ethereum";
    let next: string | null = null;
    let page = 0;

    do {
      const params = new URLSearchParams({ limit: "200" });
      if (next) params.set("next", next);

      const data = (await openseaFetch(
        `/chain/${chain}/account/${wallet.address}/nfts?${params}`
      )) as { nfts?: Record<string, unknown>[]; next?: string } | null;
      if (!data?.nfts) break;

      for (const nft of data.nfts) {
        const key = `${nft.contract}:${nft.identifier}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        allNfts.push({
          identifier: nft.identifier as string,
          collection: (nft.collection as string) ?? "",
          collectionName: (nft.collection as string) ?? "",
          name: (nft.name as string) || `#${nft.identifier}`,
          imageUrl: (nft.image_url as string) || (nft.display_image_url as string) || "",
          chain,
          contractAddress: (nft.contract as string) ?? "",
          floorPrice: null,
        });
      }

      next = (data.next as string) ?? null;
      page++;
      if (next) await delay(RATE_LIMIT_DELAY);
    } while (next && page < 5);

    await delay(RATE_LIMIT_DELAY);
  }

  return Response.json({
    nfts: allNfts,
    lastUpdated: new Date().toISOString(),
  });
}
