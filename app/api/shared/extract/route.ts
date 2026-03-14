import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type;

  const isPdf = mediaType === "application/pdf";

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        },
    {
      type: "text",
      text: `Extract all individual items and their prices from this receipt/invoice. Return a JSON object with:
1. "items": an array of objects with "name" (string) and "amount" (number, positive). Include tax lines, delivery fees, tips, etc. as separate items. Do NOT include totals or subtotals.
2. "suggestedName": a short description (2-6 words) for this receipt as a whole, e.g. "IKEA Furniture Order" or "Amazon Kitchen Supplies". Base it on the store/vendor name and the general category of items.
3. "date": the date on the receipt in YYYY-MM-DD format if visible (e.g. "2026-03-14"). Use the transaction/purchase date, not the print date. If no date is found, return null.

Return ONLY valid JSON, no other text. Example:
{"items": [{"name": "KALLAX Shelf", "amount": 89.99}, {"name": "Delivery Fee", "amount": 59.00}], "suggestedName": "IKEA Furniture Order", "date": "2026-03-14"}`,
    },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found");
    const parsed = JSON.parse(jsonMatch[0]) as {
      items: { name: string; amount: number }[];
      suggestedName?: string;
      date?: string | null;
    };
    return Response.json({
      items: parsed.items,
      suggestedName: parsed.suggestedName ?? "",
      date: parsed.date ?? null,
    });
  } catch {
    return Response.json({ error: "Failed to parse receipt", raw: text }, { status: 422 });
  }
}
