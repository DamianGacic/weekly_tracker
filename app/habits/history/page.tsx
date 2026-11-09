import { AppShell } from "@/components/AppShell";
import { HabitHistoryClient } from "@/components/HabitHistoryClient";

export default function HabitHistoryPage() {
  return (
    <AppShell section="habits" tab="history">
      <HabitHistoryClient />
    </AppShell>
  );
}
