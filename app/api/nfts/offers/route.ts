import { getSession } from "@/lib/auth";
import { openseaFetch, delay, RATE_LIMIT_DELAY } from "@/lib/opensea";
import type { OfferInfo } from "@/lib/types";

const CONCURRENCY = 1;

// Payment tokens treated as ETH-equivalent
const ETH_TOKENS = new Set(["WETH", "ETH"]);

/**
 * Fetch best offer for a specific NFT.
 */
async function fetchNFTOffer(
  slug: string,
  identifier: string
): Promise<{
  slug: string;
  identifier: string;
  offer: OfferInfo | null;
}> {
  const data = (await openseaFetch(
    `/offers/collection/${slug}/nfts/${identifier}/best`
  )) as {
    price?: { value?: string; currency?: string; decimals?: number };
    remaining_quantity?: number;
  } | null;

  let offer: OfferInfo | null = null;
  if (data?.price?.value) {
    const token = data.price.currency ?? "WETH";
    if (ETH_TOKENS.has(token)) {
      const decimals = data.price.decimals ?? 18;
      const totalPrice = Number(data.price.value) / 10 ** decimals;
      const qty = data.remaining_quantity ?? 1;
      const price = totalPrice / qty;
      if (price > 0) {
        offer = { price, paymentToken: token };
      }
    }
  }

  return { slug, identifier, offer };
}

/**
 * Streams per-NFT best offers as ndjson.
 * Accepts ?nfts=slug1:id1,slug1:id2,... query parameter.
 * Each line: { slug, identifier, offer }
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const nftsParam = url.searchParams.get("nfts") ?? "";
  const nftKeys = nftsParam
    .split(",")
    .filter(Boolean)
    .map((k) => {
      const [slug, ...rest] = k.split(":");
      return { slug, identifier: rest.join(":") };
    })
    .filter((k) => k.slug && k.identifier);

  if (nftKeys.length === 0) {
    return Response.json({ error: "No nfts provided" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < nftKeys.length; i += CONCURRENCY) {
        const batch = nftKeys.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((k) => fetchNFTOffer(k.slug, k.identifier))
        );

        for (const result of results) {
          controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
        }

        if (i + CONCURRENCY < nftKeys.length) {
          await delay(RATE_LIMIT_DELAY);
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
