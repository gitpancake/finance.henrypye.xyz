"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import CurrencyToggle from "./CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { rates, loading, error } = useCurrency();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Group nav items by dividers
  const navGroups: typeof NAV_ITEMS[] = [];
  let currentGroup: typeof NAV_ITEMS = [];
  NAV_ITEMS.forEach((item) => {
    if (item.divider && currentGroup.length > 0) {
      navGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(item);
  });
  if (currentGroup.length > 0) navGroups.push(currentGroup);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
    >
      <Sidebar>
        <SidebarHeader className="px-5 py-5">
          <h1 className="font-mono text-sm font-bold text-sidebar-primary tracking-tight">
            finance.
          </h1>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group, i) => (
            <SidebarGroup key={i} className="py-0">
              {i > 0 && <SidebarSeparator className="mb-1" />}
              <SidebarMenu>
                {group.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link href={item.href}>{item.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          {user.isAdmin && (
            <SidebarGroup className="py-0">
              <SidebarSeparator className="mb-1" />
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")}>
                    <Link href="/admin">Admin</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          {rates && (
            <div className="text-xs text-sidebar-foreground/50 px-2">
              Updated{" "}
              {new Date(rates.lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          <Separator className="bg-sidebar-border" />
          <div className="px-2 py-1">
            <div className="text-xs text-sidebar-foreground/70 mb-2">
              {user.username}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-auto p-0 text-xs text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-transparent"
            >
              Sign out
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between border-b px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <div>
              {loading && (
                <span className="text-xs text-muted-foreground">
                  Loading rates...
                </span>
              )}
              {error && (
                <span className="text-xs text-destructive">
                  Rate fetch error (using cached)
                </span>
              )}
            </div>
          </div>
          <CurrencyToggle />
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
