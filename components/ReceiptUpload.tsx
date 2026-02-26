"use client";

import { useState, useRef } from "react";
import type { Currency } from "@/lib/types";

interface ExtractedItem {
  name: string;
  amount: number;
  selected: boolean;
}

interface ReceiptUploadProps {
  onAddItems: (items: { name: string; amount: number }[]) => void;
  defaultCurrency: Currency;
}

export default function ReceiptUpload({ onAddItems, defaultCurrency }: ReceiptUploadProps) {
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setExtractedItems([]);
    setShowPreview(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/shared/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract receipt");
      }

      const { items } = await res.json();
      setExtractedItems(items.map((i: { name: string; amount: number }) => ({ ...i, selected: true })));
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process receipt");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleItem = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleAdd = () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    onAddItems(selected.map(({ name, amount }) => ({ name, amount })));
    setShowPreview(false);
    setExtractedItems([]);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setExtractedItems([]);
    setError("");
  };

  const selectedTotal = extractedItems
    .filter((i) => i.selected)
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {loading ? "Processing..." : "Upload Receipt"}
        </label>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {showPreview && extractedItems.length > 0 && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              Extracted Items ({extractedItems.filter((i) => i.selected).length}/{extractedItems.length} selected)
            </span>
            <span className="font-mono text-xs text-zinc-500">
              Total: {defaultCurrency} {selectedTotal.toFixed(2)}
            </span>
          </div>

          <table className="sheet w-full">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th className="text-left">Item</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {extractedItems.map((item, i) => (
                <tr
                  key={i}
                  className={`cursor-pointer ${!item.selected ? "opacity-40" : ""}`}
                  onClick={() => toggleItem(i)}
                >
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(i)}
                      className="accent-zinc-900"
                    />
                  </td>
                  <td className="text-sm">{item.name}</td>
                  <td className="text-right font-mono text-sm">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={extractedItems.filter((i) => i.selected).length === 0}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              Add Selected Items
            </button>
            <button
              onClick={handleCancel}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
