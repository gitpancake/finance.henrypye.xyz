"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import CurrencyToggle from "./CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfileDialog from "@/components/profile-dialog";
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
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0]?.toUpperCase() ?? "?";
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { rates, loading, error } = useCurrency();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

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
          <Link href="/" className="font-mono text-sm font-bold text-sidebar-primary tracking-tight hover:opacity-80 transition-opacity">
            finance<span className="text-emerald-500">.</span>
          </Link>
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
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 mb-2 w-full text-left hover:opacity-80 transition-opacity"
            >
              <Avatar className="size-6">
                {user.photoURL && (
                  <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />
                )}
                <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-accent-foreground">
                  {getInitials(user.displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-sidebar-foreground/70 truncate">
                {user.displayName ?? user.email}
              </span>
            </button>
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
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <Link href="/" className="hidden sm:flex items-center gap-0.5">
              <span className="font-mono text-sm font-bold tracking-tight">finance</span>
              <span className="font-mono text-sm font-bold text-emerald-500">.</span>
            </Link>
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
          <div className="flex items-center gap-1">
            <ThemeTogglerButton variant="ghost" size="sm" modes={["dark", "light"]} />
            <CurrencyToggle />
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </SidebarInset>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </SidebarProvider>
  );
}
