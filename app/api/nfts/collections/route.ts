import { getSession } from "@/lib/auth";
import { openseaFetch, delay, RATE_LIMIT_DELAY } from "@/lib/opensea";
import type { CollectionOffer } from "@/lib/types";

const CONCURRENCY = 1;
const MAX_OFFERS = 50;

// Payment tokens treated as ETH-equivalent
const ETH_TOKENS = new Set(["WETH", "ETH"]);

interface OfferRecord {
  price?: { value?: string; currency?: string; decimals?: number };
  remaining_quantity?: number;
}

function parseAllOffers(offers: OfferRecord[]): CollectionOffer[] {
  const parsed: CollectionOffer[] = [];
  for (const offer of offers) {
    const priceData = offer.price;
    if (!priceData?.value) continue;
    const token = priceData.currency ?? "WETH";
    if (!ETH_TOKENS.has(token)) continue;
    const decimals = priceData.decimals ?? 18;
    const totalPrice = Number(priceData.value) / 10 ** decimals;
    if (totalPrice <= 0) continue;
    const qty = offer.remaining_quantity ?? 1;
    // price.value is the TOTAL price for all units; divide to get per-unit
    const perUnitPrice = totalPrice / qty;
    parsed.push({
      price: perUnitPrice,
      paymentToken: token,
      remainingQuantity: qty,
    });
  }
  parsed.sort((a, b) => b.price - a.price);
  return parsed.slice(0, MAX_OFFERS);
}

/**
 * Fetch a single collection's name, floor price, and best offer in parallel.
 */
async function fetchCollectionInfo(slug: string) {
  const [info, stats, offersRaw] = await Promise.all([
    openseaFetch(`/collections/${slug}`) as Promise<{ name?: string } | null>,
    openseaFetch(`/collections/${slug}/stats`) as Promise<{ total?: { floor_price?: number } } | null>,
    openseaFetch(`/offers/collection/${slug}`),
  ]);
  const offers = offersRaw as { offers?: OfferRecord[] } | null;

  const floor =
    typeof stats?.total?.floor_price === "number" && stats.total.floor_price > 0
      ? stats.total.floor_price
      : null;

  const allOffers = offers?.offers?.length ? parseAllOffers(offers.offers) : [];

  return {
    slug,
    name: info?.name || slug,
    floorPrice: floor,
    offers: allOffers,
    bestOfferPrice: allOffers.length > 0 ? allOffers[0].price : null,
  };
}

/**
 * Phase 2: Streams collection info (name, floor price, best offer) as ndjson.
 * Accepts ?slugs=slug1,slug2,... query parameter.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slugsParam = url.searchParams.get("slugs") ?? "";
  const slugs = slugsParam.split(",").filter(Boolean);

  if (slugs.length === 0) {
    return Response.json({ error: "No slugs provided" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < slugs.length; i += CONCURRENCY) {
        const batch = slugs.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(fetchCollectionInfo));

        for (const result of results) {
          controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
        }

        if (i + CONCURRENCY < slugs.length) {
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
