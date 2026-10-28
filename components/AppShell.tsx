import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppHeader, type Tab } from "@/components/AppHeader";
import { SectionNav, type Section } from "@/components/SectionNav";

/** Section rail on the left, then the section's tab header above the page content. */
export function AppShell({
  section,
  tab,
  wide = false,
  children,
}: {
  section: Section;
  tab: Tab;
  /** Wider on desktop, for pages with a sidebar next to their main column. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <SectionNav section={section} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader section={section} tab={tab} />
        <main className={cn("mx-auto w-full max-w-2xl px-4 py-8 sm:px-6", wide && "lg:max-w-4xl")}>
          {children}
        </main>
      </div>
    </div>
  );
}
