import Anthropic from "@anthropic-ai/sdk";
import type { FinanceState, NFTPortfolio, CollectionOffer } from "@/lib/types";
import { getSession } from "@/lib/auth";

const anthropic = new Anthropic();

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

function buildPrompt(data: FinanceState, nftPortfolio?: NFTPortfolio | null): string {
  const sections: string[] = [];

  // Accounts
  if (data.accounts.length > 0) {
    sections.push("## Bank Accounts & Credit Cards");
    for (const a of data.accounts) {
      const type = a.type === "bank" ? "Bank Account" : "Credit Card";
      const outgoings = a.isOutgoingsAccount ? " (primary outgoings account)" : "";
      sections.push(`- ${a.name} (${type}${outgoings}): ${a.currency} ${a.balance}${a.notes ? ` — ${a.notes}` : ""}`);
    }
  }

  // Debts (only active ones)
  const activeDebts = data.debts.filter((d) => !d.paidOff);
  if (activeDebts.length > 0) {
    sections.push("\n## Debts");
    for (const d of activeDebts) {
      sections.push(`- Owed to ${d.creditor}: ${d.currency} ${d.amount}${d.notes ? ` — ${d.notes}` : ""}`);
    }
  }

  // Family debts (excluded from dashboard net worth)
  if (data.familyDebts.length > 0) {
    sections.push("\n## Family Debts (not included in net worth)");
    for (const d of data.familyDebts) {
      const paid = d.paid ? ` (${d.currency} ${d.paid} paid)` : "";
      const status = d.paidOff ? " [PAID OFF]" : "";
      sections.push(`- ${d.familyMember} — ${d.description}: ${d.currency} ${d.amount}${paid}${status}${d.notes ? ` — ${d.notes}` : ""}`);
    }
  }

  // Family owed
  if (data.familyOwed.length > 0) {
    sections.push("\n## Money Owed by Family (not included in net worth)");
    for (const f of data.familyOwed) {
      const remaining = f.amount - f.paid;
      const status = f.paidOff ? " [PAID OFF]" : ` (${f.currency} ${remaining} remaining)`;
      sections.push(`- ${f.person} — ${f.description}: ${f.currency} ${f.amount}${status}${f.notes ? ` — ${f.notes}` : ""}`);
    }
  }

  // Crypto
  if (data.crypto.length > 0) {
    sections.push("\n## Crypto Holdings");
    for (const c of data.crypto) {
      sections.push(`- ${c.amount} ${c.asset}`);
    }
  }

  // NFT Portfolio
  if (nftPortfolio && nftPortfolio.nfts.length > 0) {
    sections.push("\n## NFT Portfolio");
    const nfts = nftPortfolio.nfts;
    const collections = nftPortfolio.collections ?? {};

    // Group by collection
    const byCollection = new Map<string, typeof nfts>();
    for (const nft of nfts) {
      const key = nft.collection || "unknown";
      if (!byCollection.has(key)) byCollection.set(key, []);
      byCollection.get(key)!.push(nft);
    }

    let totalOfferETH = 0;
    for (const [slug, items] of byCollection) {
      const collInfo = collections[slug];
      const collName = items[0]?.collectionName || slug;
      const floor = items[0]?.floorPrice ?? 0;

      // Calculate offer value (same no-double-counting logic as dashboard)
      const itemBidTotal = items.reduce(
        (s, nft) => s + (nft.bestOffer?.isItemOffer ? nft.bestOffer.price : 0), 0
      );
      const itemsWithBids = items.filter((nft) => nft.bestOffer?.isItemOffer).length;
      const remainingCount = items.length - itemsWithBids;
      const collOffers = collInfo?.offers ?? [];
      const collOfferTotal = remainingCount > 0 ? calculateTopNOfferValue(collOffers, remainingCount) : 0;
      const offerValue = itemBidTotal + collOfferTotal;
      totalOfferETH += offerValue;

      const floorStr = floor > 0 ? `, floor: ${floor.toFixed(4)} ETH each` : "";
      const offerStr = offerValue > 0 ? `, best offers total: ${offerValue.toFixed(4)} ETH` : "";
      sections.push(`- ${collName}: ${items.length} item${items.length !== 1 ? "s" : ""}${floorStr}${offerStr}`);
    }
    sections.push(`\nTotal NFTs: ${nfts.length}, Total Offer Value: ${totalOfferETH.toFixed(4)} ETH`);
    sections.push(`Note: NFT offer value IS included in the net worth calculation on the dashboard.`);
  }

  // Incoming
  if (data.incomings.length > 0) {
    sections.push("\n## Expected Incoming Money");
    for (const i of data.incomings) {
      sections.push(`- ${i.source}: ${i.currency} ${i.amount} (${i.status})${i.notes ? ` — ${i.notes}` : ""}`);
    }
  }

  // Pet expenses (excluded from dashboard totals)
  if (data.petExpenses.length > 0) {
    sections.push("\n## Pet Expenses (not included in net worth)");
    for (const p of data.petExpenses) {
      const shared = p.sharedWithUserId ? " (shared)" : "";
      sections.push(`- ${p.description}: ${p.currency} ${p.amount} on ${p.date}${shared}${p.notes ? ` — ${p.notes}` : ""}`);
    }
  }

  // Budgets (current and recent months)
  if (data.budgets.length > 0) {
    sections.push("\n## Monthly Budgets");
    const sorted = [...data.budgets].sort((a, b) => b.month.localeCompare(a.month));
    for (const budget of sorted.slice(0, 3)) {
      const income = budget.lineItems.find(li => li.category === "income");
      const expenses = budget.lineItems.filter(li => li.category === "expense");
      sections.push(`\n### ${budget.month}`);
      if (income) {
        sections.push(`Annual Income: ${income.currency} ${income.amount}`);
      }
      if (expenses.length > 0) {
        sections.push("Monthly Expenses:");
        for (const e of expenses) {
          const recurring = e.recurring ? " (recurring)" : " (one-off)";
          const day = e.dayOfMonth ? ` day ${e.dayOfMonth}` : "";
          sections.push(`- ${e.label}: ${e.currency} ${e.amount}${recurring}${day}`);
        }
      }
    }
  }

  // Annual subscriptions
  if (data.annualSubscriptions.length > 0) {
    sections.push("\n## Annual Subscriptions");
    for (const s of data.annualSubscriptions) {
      const renewal = s.nextRenewal ? ` (renews ${s.nextRenewal})` : "";
      sections.push(`- ${s.label}: ${s.currency} ${s.amount}${renewal}${s.notes ? ` — ${s.notes}` : ""}`);
    }
  }

  return sections.join("\n");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, nftPortfolio, context } = (await req.json()) as {
    data: FinanceState;
    nftPortfolio?: NFTPortfolio | null;
    context?: string;
  };
  const financialSummary = buildPrompt(data, nftPortfolio);

  const contextBlock = context?.trim()
    ? `\n\n## Additional Context from User\n${context.trim()}\n`
    : "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a personal financial advisor. Your client is a British software engineer currently living in Vancouver, BC, Canada on an IEC (International Experience Canada) visa. Key context about them:

- **Work**: Works in tech, heavily leverages AI tooling. Income is in the data below.
- **Multi-country life**: Frequently travels between the UK, Canada, and the US. Has accounts and financial obligations in multiple currencies (GBP, CAD, USD, EUR).
- **Tax situation**: On an IEC visa in Canada (BC). Subject to Canadian tax if resident 183+ days. UK-Canada tax treaty applies — tax paid in Canada can be credited against UK liability. Must file in both countries.
- **Crypto/NFT exposure**: Holds crypto and NFTs — these are speculative and illiquid to varying degrees.
- **Multi-currency complexity**: Moving money between GBP, CAD, and USD accounts incurs FX costs. Consider this when recommending debt repayment or fund movements.

They have provided their complete financial data below. Give them a concise, practical financial report with specific recommendations.

Focus on:
1. **Financial Health Overview** — summarise their net worth (including crypto and NFT offer value), debt-to-asset ratio, and cash position. Break down assets by type (cash, crypto, NFTs). Note which currencies their liquidity is in.
2. **Debt Repayment Strategy** — what should they pay off first and why? Consider interest rates, currencies, and FX costs. For credit card balances, flag any that should be cleared immediately. Be specific about which account to pay from.
3. **Budget Analysis** — are they spending too much? Where can they cut back? Consider both recurring and one-off expenses. Flag any subscriptions that could be consolidated or dropped.
4. **Multi-Currency & Travel** — advice on managing money across GBP/CAD/USD given their travel patterns. When should they move money between currencies? Are there FX-efficient strategies?
5. **Action Items** — a prioritised list of 3-5 things they should do this month, with specific amounts and accounts referenced.

Note: Family debts, family owed, and pet expenses are tracked separately and NOT included in the net worth calculation. You may comment on them if relevant but don't mix them into the net worth figures.

Be direct and specific. Reference their actual numbers. Don't be generic — use the data. Keep it under 1000 words. Use markdown formatting.

---

# Financial Data

${financialSummary}${contextBlock}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        controller.close();
      });
      await stream.finalMessage();
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
