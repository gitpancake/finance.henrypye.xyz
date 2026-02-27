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
  onAddGrouped: (name: string, amount: number) => void;
  defaultCurrency: Currency;
}

export default function ReceiptUpload({ onAddItems, onAddGrouped, defaultCurrency }: ReceiptUploadProps) {
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [suggestedName, setSuggestedName] = useState("");
  const [groupedName, setGroupedName] = useState("");
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

      const { items, suggestedName: suggested } = await res.json();
      setExtractedItems(items.map((i: { name: string; amount: number }) => ({ ...i, selected: true })));
      setSuggestedName(suggested || "");
      setGroupedName(suggested || "");
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

  const handleAddIndividual = () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    onAddItems(selected.map(({ name, amount }) => ({ name, amount })));
    reset();
  };

  const handleAddAsGrouped = () => {
    if (!groupedName.trim()) return;
    onAddGrouped(groupedName.trim(), selectedTotal);
    reset();
  };

  const reset = () => {
    setShowPreview(false);
    setExtractedItems([]);
    setSuggestedName("");
    setGroupedName("");
    setError("");
  };

  const selectedTotal = extractedItems
    .filter((i) => i.selected)
    .reduce((s, i) => s + i.amount, 0);

  const selectedCount = extractedItems.filter((i) => i.selected).length;

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
              Extracted Items ({selectedCount}/{extractedItems.length} selected)
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

          {/* Grouped add */}
          <div className="mt-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-medium text-zinc-500 mb-2">Add as single line item</div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={groupedName}
                onChange={(e) => setGroupedName(e.target.value)}
                placeholder="Description"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
                onKeyDown={(e) => e.key === "Enter" && handleAddAsGrouped()}
              />
              <span className="font-mono text-sm text-zinc-500 whitespace-nowrap">
                {defaultCurrency} {selectedTotal.toFixed(2)}
              </span>
              <button
                onClick={handleAddAsGrouped}
                disabled={selectedCount === 0 || !groupedName.trim()}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 whitespace-nowrap"
              >
                Add Grouped
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAddIndividual}
              disabled={selectedCount === 0}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              Add as {selectedCount} Separate Item{selectedCount !== 1 ? "s" : ""}
            </button>
            <button
              onClick={reset}
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
