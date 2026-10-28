"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store/AuthProvider";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import type { Section } from "@/components/SectionNav";

export type Tab = "week" | "list" | "history";

const NAV_LINKS: Record<Section, { key: Tab; href: string; label: string }[]> = {
  macros: [
    { key: "week", href: "/", label: "This week" },
    { key: "list", href: "/items", label: "Your items" },
    { key: "history", href: "/history", label: "History" },
  ],
  movement: [
    { key: "week", href: "/movement", label: "This week" },
    { key: "list", href: "/movement/moves", label: "Your moves" },
    { key: "history", href: "/movement/history", label: "History" },
  ],
};

export function AppHeader({ section, tab }: { section: Section; tab: Tab }) {
  const { status, email } = useAuth();

  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-6">
        {/* Hidden on phones, where the section rail already takes up some of the width. */}
        <span className="hidden text-lg font-semibold sm:inline">weekly</span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS[section].map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={
                tab === link.key
                  ? "font-medium whitespace-nowrap text-foreground"
                  : "whitespace-nowrap text-muted-foreground hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {status === "authed" && email ? (
        <AccountMenu email={email} />
      ) : status === "anon" ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/login" />}>
          <span className="sm:hidden">Sign in</span>
          <span className="hidden sm:inline">Sign in to save online</span>
        </Button>
      ) : (
        <div className="h-8 w-24" />
      )}
    </header>
  );
}
