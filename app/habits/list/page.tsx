import { AppShell } from "@/components/AppShell";
import { HabitsListClient } from "@/components/HabitsListClient";

export default function HabitsListPage() {
  return (
    <AppShell section="habits" tab="list">
      <HabitsListClient />
    </AppShell>
  );
}
