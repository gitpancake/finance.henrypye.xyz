import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL ?? "https://rpc.gnosischain.com";

// USDC on Ethereum mainnet (6 decimals)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// GBP-E (Monerium GBP emoney) on Gnosis (18 decimals)
const GBPE_ADDRESS = "0x5Cb9073902F2035222B9749F8fB0c9BFe5527108";
// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = "0x70a08231";

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      console.error(`RPC returned non-JSON (${method}): ${res.status} ${contentType}`);
      return null;
    }
    const data = await res.json();
    if (data.error) {
      console.error(`RPC error (${method}):`, data.error);
      return null;
    }
    return data.result;
  }
  console.error(`RPC rate limited after 3 retries (${method})`);
  return null;
}

async function getEthBalance(address: string): Promise<number> {
  const result = await rpcCall(ETHEREUM_RPC_URL, "eth_getBalance", [address, "latest"]);
  if (!result || typeof result !== "string") return 0;
  return Number(BigInt(result)) / 1e18;
}

async function getErc20Balance(rpcUrl: string, tokenAddress: string, walletAddress: string, decimals: number): Promise<number> {
  const paddedAddress = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const callData = BALANCE_OF_SELECTOR + paddedAddress;

  const result = await rpcCall(rpcUrl, "eth_call", [
    { to: tokenAddress, data: callData },
    "latest",
  ]);
  if (!result || typeof result !== "string" || result === "0x") return 0;
  return Number(BigInt(result)) / 10 ** decimals;
}

export interface WalletBalance {
  address: string;
  label: string;
  chain: string;
  ethBalance: number;
  usdcBalance: number;
  gbpeBalance: number;
}

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
    return Response.json({ wallets: [] });
  }

  const results: WalletBalance[] = [];

  for (const wallet of wallets) {
    if (wallet.chain === "ethereum") {
      const [ethBalance, usdcBalance] = await Promise.all([
        getEthBalance(wallet.address),
        getErc20Balance(ETHEREUM_RPC_URL, USDC_ADDRESS, wallet.address, 6),
      ]);

      results.push({
        address: wallet.address,
        label: wallet.label || wallet.address.slice(0, 8),
        chain: wallet.chain,
        ethBalance,
        usdcBalance,
        gbpeBalance: 0,
      });
    } else if (wallet.chain === "gnosis") {
      const gbpeBalance = await getErc20Balance(GNOSIS_RPC_URL, GBPE_ADDRESS, wallet.address, 18);

      results.push({
        address: wallet.address,
        label: wallet.label || wallet.address.slice(0, 8),
        chain: wallet.chain,
        ethBalance: 0,
        usdcBalance: 0,
        gbpeBalance,
      });
    } else {
      results.push({
        address: wallet.address,
        label: wallet.label || wallet.address.slice(0, 8),
        chain: wallet.chain,
        ethBalance: 0,
        usdcBalance: 0,
        gbpeBalance: 0,
      });
    }
  }

  return Response.json({ wallets: results });
}
