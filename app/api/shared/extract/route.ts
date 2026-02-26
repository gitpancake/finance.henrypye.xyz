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
      text: `Extract all individual items and their prices from this receipt/invoice. Return a JSON array with objects having "name" (string) and "amount" (number, positive). Include tax lines, delivery fees, tips, etc. as separate items. Do NOT include totals or subtotals as items — only individual line items.

Return ONLY valid JSON array, no other text. Example:
[{"name": "IKEA KALLAX Shelf", "amount": 89.99}, {"name": "Delivery Fee", "amount": 59.00}]`,
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
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    const items = JSON.parse(jsonMatch[0]) as { name: string; amount: number }[];
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Failed to parse receipt", raw: text }, { status: 422 });
  }
}
