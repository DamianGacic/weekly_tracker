import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    // Wide on desktop to fit the goals sidebar while the main column keeps its usual width.
    <AppShell section="macros" tab="week" wide>
      <DashboardClient />
    </AppShell>
  );
}
