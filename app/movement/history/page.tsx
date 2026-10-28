import { AppShell } from "@/components/AppShell";
import { MovementHistoryClient } from "@/components/MovementHistoryClient";

export default function MovementHistoryPage() {
  return (
    <AppShell section="movement" tab="history">
      <MovementHistoryClient />
    </AppShell>
  );
}
