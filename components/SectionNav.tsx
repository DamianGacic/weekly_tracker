import Link from "next/link";
import { Activity, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export type Section = "macros" | "movement";

const SECTIONS = [
  { key: "macros", href: "/", label: "Macros", Icon: Utensils },
  { key: "movement", href: "/movement", label: "Movement", Icon: Activity },
] as const;

/** Rail on the left for switching between the app's sections. Icons only on phones, to save width. */
export function SectionNav({ section }: { section: Section }) {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 flex h-svh w-12 shrink-0 flex-col items-center gap-1 border-r py-3 sm:w-16"
    >
      {SECTIONS.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          title={label}
          aria-current={section === key ? "page" : undefined}
          className={cn(
            "flex w-10 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium sm:w-14",
            section === key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Icon className="size-5" />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
