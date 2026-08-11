"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/store/AuthProvider";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { key: "week", href: "/", label: "This week" },
  { key: "items", href: "/items", label: "Your items" },
  { key: "history", href: "/history", label: "History" },
] as const;

export function AppHeader({ active }: { active: "week" | "items" | "history" }) {
  const { status, email } = useAuth();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

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
      {status === "authed" ? (
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
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
