"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store/AuthProvider";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";

const NAV_LINKS = [
  { key: "week", href: "/", label: "This week" },
  { key: "items", href: "/items", label: "Your items" },
  { key: "history", href: "/history", label: "History" },
] as const;

export function AppHeader({ active }: { active: "week" | "items" | "history" }) {
  const { status, email } = useAuth();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold">weekly</span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={
                active === link.key
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
          Sign in to save online
        </Button>
      ) : (
        <div className="h-8 w-24" />
      )}
    </header>
  );
}
