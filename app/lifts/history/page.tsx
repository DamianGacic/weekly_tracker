import { AppShell } from "@/components/AppShell";
import { LiftHistoryClient } from "@/components/LiftHistoryClient";

export default function LiftHistoryPage() {
  return (
    <AppShell section="lifts" tab="history">
      <LiftHistoryClient />
    </AppShell>
  );
}
