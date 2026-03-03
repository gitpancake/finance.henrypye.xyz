"use client";

import { useState, useRef, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { loadNFTPortfolio } from "@/lib/storage";
import type { NFTPortfolio } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { state, isLoaded } = useFinance();
  const [context, setContext] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [nftCache, setNftCache] = useState<NFTPortfolio | null>(null);
  useEffect(() => {
    setNftCache(loadNFTPortfolio());
  }, []);

  const generate = async () => {
    setReport("");
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: state, nftPortfolio: nftCache, context }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to generate report (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setReport(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  if (!isLoaded) return <Skeleton className="h-6 w-48" />;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Financial Report</h1>

      <div className="mb-6">
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder='Add context for the report... e.g. "I&#39;m thinking about moving to a cheaper neighbourhood" or "I want to save for a trip to Europe"'
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!report && !loading && !error && (
        <div className="text-center text-sm text-muted-foreground py-16">
          Generate a report to get AI-powered financial insights and savings suggestions for living in Vancouver.
        </div>
      )}

      {report && (
        <Card>
          <CardContent className="p-6">
            <div
              className="report-content text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(report) }}
            />
          </CardContent>
        </Card>
      )}

      {loading && !report && (
        <div className="text-center text-sm text-muted-foreground py-16 animate-pulse">
          Analysing your finances...
        </div>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded p-3 overflow-x-auto text-xs font-mono my-3"><code>$2</code></pre>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, '<hr class="my-4 border-border" />')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^(?!<[hluop]|<li|<hr|<pre)(.+)$/gm, '<p class="my-2">$1</p>');

  html = html.replace(
    /(<li class="ml-4 list-disc">[\s\S]*?<\/li>)(?=\s*(?:<li class="ml-4 list-disc">|$))/g,
    "$1"
  );
  html = html.replace(
    /((?:<li class="ml-4 list-disc">[^]*?<\/li>\s*)+)/g,
    '<ul class="my-2 space-y-1">$1</ul>'
  );
  html = html.replace(
    /((?:<li class="ml-4 list-decimal">[^]*?<\/li>\s*)+)/g,
    '<ol class="my-2 space-y-1">$1</ol>'
  );

  return html;
}
