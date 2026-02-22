const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY ?? "";
const OPENSEA_BASE = "https://api.opensea.io/api/v2";

export const RATE_LIMIT_DELAY = 650;

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openseaFetch(path: string, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${OPENSEA_BASE}${path}`, {
      headers: {
        accept: "application/json",
        "x-api-key": OPENSEA_API_KEY,
      },
    });
    if (res.status === 429 && attempt < retries) {
      await delay(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      console.error(`OpenSea ${path}: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  }
  return null;
}
