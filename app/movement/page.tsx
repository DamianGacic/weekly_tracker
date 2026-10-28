import { AppShell } from "@/components/AppShell";
import { MovementDashboardClient } from "@/components/MovementDashboardClient";

export default function MovementPage() {
  return (
    <AppShell section="movement" tab="week">
      <MovementDashboardClient />
    </AppShell>
  );
}
