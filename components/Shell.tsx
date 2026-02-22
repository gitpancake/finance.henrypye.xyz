"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import CurrencyToggle from "./CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { rates, loading, error } = useCurrency();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="flex w-52 shrink-0 flex-col bg-zinc-900 text-zinc-400">
        <div className="px-5 py-5">
          <h1 className="font-mono text-sm font-bold text-white tracking-tight">
            finance.
          </h1>
        </div>
        <div className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  item.divider ? "mt-2 pt-2 border-t border-zinc-800" : ""
                } ${
                  isActive
                    ? "bg-zinc-800 text-white font-medium"
                    : "hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user.isAdmin && (
            <Link
              href="/admin"
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-zinc-800 text-white font-medium"
                  : "hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="mt-auto px-5 py-4 space-y-3">
          {rates && (
            <div className="text-xs text-zinc-600">
              Updated{" "}
              {new Date(rates.lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          <div className="border-t border-zinc-800 pt-3">
            <div className="text-xs text-zinc-500 mb-2">{user.username}</div>
            <button
              onClick={logout}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 px-8 py-3">
          <div>
            {loading && (
              <span className="text-xs text-zinc-400">Loading rates...</span>
            )}
            {error && (
              <span className="text-xs text-red-500">
                Rate fetch error (using cached)
              </span>
            )}
          </div>
          <CurrencyToggle />
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
