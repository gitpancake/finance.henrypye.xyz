"use client";

import { useState, useRef } from "react";
import type { Currency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
        <Button variant="outline" size="sm" asChild>
          <label className="cursor-pointer">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {loading ? "Processing..." : "Upload Receipt"}
          </label>
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {showPreview && extractedItems.length > 0 && (
        <Card className="mt-3">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Extracted Items ({selectedCount}/{extractedItems.length} selected)
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Total: {defaultCurrency} {selectedTotal.toFixed(2)}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs uppercase tracking-wide text-muted-foreground font-medium"></TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Item</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedItems.map((item, i) => (
                  <TableRow
                    key={i}
                    className={`cursor-pointer ${!item.selected ? "opacity-40" : ""}`}
                    onClick={() => toggleItem(i)}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(i)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-3 rounded-md border border-dashed p-3 bg-muted">
              <div className="text-xs font-medium text-muted-foreground mb-2">Add as single line item</div>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  value={groupedName}
                  onChange={(e) => setGroupedName(e.target.value)}
                  placeholder="Description"
                  className="flex-1 h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAsGrouped()}
                />
                <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  {defaultCurrency} {selectedTotal.toFixed(2)}
                </span>
                <Button
                  onClick={handleAddAsGrouped}
                  disabled={selectedCount === 0 || !groupedName.trim()}
                  size="sm"
                >
                  Add Grouped
                </Button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddIndividual}
                disabled={selectedCount === 0}
              >
                Add as {selectedCount} Separate Item{selectedCount !== 1 ? "s" : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
