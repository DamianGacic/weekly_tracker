import { AppShell } from "@/components/AppShell";
import { LiftsClient } from "@/components/LiftsClient";

export default function LiftsListPage() {
  return (
    <AppShell section="lifts" tab="list">
      <LiftsClient />
    </AppShell>
  );
}
