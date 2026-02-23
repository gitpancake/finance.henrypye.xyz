"use client";

import { useState, useRef, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { loadNFTPortfolio } from "@/lib/storage";
import type { NFTPortfolio } from "@/lib/types";

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

  if (!isLoaded) return <div className="text-sm text-zinc-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">Financial Report</h1>

      <div className="mb-6">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Add context for the report... e.g. &quot;I'm thinking about moving to a cheaper neighbourhood&quot; or &quot;I want to save for a trip to Europe&quot;"
          rows={3}
          className="w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="text-center text-sm text-zinc-400 py-16">
          Generate a report to get AI-powered financial insights and savings suggestions for living in Vancouver.
        </div>
      )}

      {report && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div
            className="report-content text-sm text-zinc-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(report) }}
          />
        </div>
      )}

      {loading && !report && (
        <div className="text-center text-sm text-zinc-400 py-16 animate-pulse">
          Analysing your finances...
        </div>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  let html = md
    // code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-50 rounded p-3 overflow-x-auto text-xs font-mono my-3"><code>$2</code></pre>')
    // headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-zinc-900 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-zinc-900 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-zinc-900 mt-6 mb-3">$1</h1>')
    // bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-zinc-200" />')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // paragraphs: wrap non-tag lines
    .replace(/^(?!<[hluop]|<li|<hr|<pre)(.+)$/gm, '<p class="my-2">$1</p>');

  // Wrap consecutive <li> in <ul>
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
