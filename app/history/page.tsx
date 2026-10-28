import { AppShell } from "@/components/AppShell";
import { HistoryClient } from "@/components/HistoryClient";

export default function HistoryPage() {
  return (
    <AppShell section="macros" tab="history">
      <HistoryClient />
    </AppShell>
  );
}
