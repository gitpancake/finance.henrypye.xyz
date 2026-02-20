import Anthropic from "@anthropic-ai/sdk";
import type { FinanceState } from "@/lib/types";

const anthropic = new Anthropic();

function buildPrompt(data: FinanceState): string {
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

  // Debts
  if (data.debts.length > 0) {
    sections.push("\n## Debts");
    for (const d of data.debts) {
      sections.push(`- Owed to ${d.creditor}: ${d.currency} ${d.amount}${d.notes ? ` — ${d.notes}` : ""}`);
    }
  }

  // Crypto
  if (data.crypto.length > 0) {
    sections.push("\n## Crypto Holdings");
    for (const c of data.crypto) {
      sections.push(`- ${c.amount} ${c.asset}`);
    }
  }

  // Incoming
  if (data.incomings.length > 0) {
    sections.push("\n## Expected Incoming Money");
    for (const i of data.incomings) {
      sections.push(`- ${i.source}: ${i.currency} ${i.amount} (${i.status})${i.notes ? ` — ${i.notes}` : ""}`);
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
          const day = e.dayOfMonth ? ` (day ${e.dayOfMonth})` : "";
          sections.push(`- ${e.label}: ${e.currency} ${e.amount}${day}`);
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
  const { data, context } = (await req.json()) as { data: FinanceState; context?: string };
  const financialSummary = buildPrompt(data);

  const contextBlock = context?.trim()
    ? `\n\n## Additional Context from User\n${context.trim()}\n`
    : "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a personal financial advisor for someone living in Vancouver, BC, Canada. They have provided you with their complete financial data below. Give them a concise, practical financial report with specific recommendations.

Focus on:
1. **Financial Health Overview** — summarise their net worth, debt-to-asset ratio, and cash position
2. **Budget Analysis** — are they spending too much? Where can they cut back?
3. **Debt Strategy** — what should they pay off first and why?
4. **Savings Opportunities** — specific, actionable advice for saving money living in Vancouver (groceries, transit, housing tips, etc.)
5. **Action Items** — a prioritised list of 3-5 things they should do this month

Be direct and specific. Reference their actual numbers. Don't be generic — use the data. Keep it under 800 words. Use markdown formatting.

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
