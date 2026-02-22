import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RPC_URL = process.env.ETHEREUM_RPC_URL ?? "https://eth.llamarpc.com";

// USDC on Ethereum mainnet (6 decimals)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = "0x70a08231";

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`RPC error (${method}):`, data.error);
    return null;
  }
  return data.result;
}

async function getEthBalance(address: string): Promise<number> {
  const result = await rpcCall("eth_getBalance", [address, "latest"]);
  if (!result || typeof result !== "string") return 0;
  return Number(BigInt(result)) / 1e18;
}

async function getUsdcBalance(address: string): Promise<number> {
  // Encode balanceOf(address): selector + address padded to 32 bytes
  const paddedAddress = address.toLowerCase().replace("0x", "").padStart(64, "0");
  const callData = BALANCE_OF_SELECTOR + paddedAddress;

  const result = await rpcCall("eth_call", [
    { to: USDC_ADDRESS, data: callData },
    "latest",
  ]);
  if (!result || typeof result !== "string" || result === "0x") return 0;
  return Number(BigInt(result)) / 1e6; // USDC has 6 decimals
}

export interface WalletBalance {
  address: string;
  label: string;
  chain: string;
  ethBalance: number;
  usdcBalance: number;
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
    if (wallet.chain !== "ethereum") {
      results.push({
        address: wallet.address,
        label: wallet.label || wallet.address.slice(0, 8),
        chain: wallet.chain,
        ethBalance: 0,
        usdcBalance: 0,
      });
      continue;
    }

    const [ethBalance, usdcBalance] = await Promise.all([
      getEthBalance(wallet.address),
      getUsdcBalance(wallet.address),
    ]);

    results.push({
      address: wallet.address,
      label: wallet.label || wallet.address.slice(0, 8),
      chain: wallet.chain,
      ethBalance,
      usdcBalance,
    });
  }

  return Response.json({ wallets: results });
}
