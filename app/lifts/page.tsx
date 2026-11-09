import { AppShell } from "@/components/AppShell";
import { LiftDashboardClient } from "@/components/LiftDashboardClient";

export default function LiftsPage() {
  return (
    <AppShell section="lifts" tab="week">
      <LiftDashboardClient />
    </AppShell>
  );
}
