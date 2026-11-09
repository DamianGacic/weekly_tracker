import { AppShell } from "@/components/AppShell";
import { HabitsDashboardClient } from "@/components/HabitsDashboardClient";

export default function HabitsPage() {
  return (
    <AppShell section="habits" tab="week">
      <HabitsDashboardClient />
    </AppShell>
  );
}
