import { AppShell } from "@/components/AppShell";
import { ProgressionClient } from "@/components/ProgressionClient";

export default function ProgressionPage() {
  return (
    <AppShell section="macros" tab="progression" wide>
      <ProgressionClient />
    </AppShell>
  );
}
