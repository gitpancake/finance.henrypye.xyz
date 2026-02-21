"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Shell from "./Shell";

interface UserInfo {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setUser({ userId: d.userId, username: d.username, isAdmin: d.isAdmin });
          setStatus("unlocked");
        } else {
          setStatus("locked");
        }
      })
      .catch(() => setStatus("locked"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const d = await res.json();
        setUser({ userId: d.userId, username: d.username, isAdmin: d.isAdmin });
        setStatus("unlocked");
      } else {
        setError("Invalid credentials");
        setPassword("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (status === "unlocked" && user) {
    return (
      <AuthProvider user={user}>
        <FinanceProvider userId={user.userId}>
          <CurrencyProvider>
            <Shell>{children}</Shell>
          </CurrencyProvider>
        </FinanceProvider>
      </AuthProvider>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="font-mono text-sm font-bold text-zinc-900 tracking-tight mb-1">
            finance.
          </h1>
          <p className="text-xs text-zinc-400 mb-8">
            Sign in to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
