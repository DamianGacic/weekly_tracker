import { AppShell } from "@/components/AppShell";
import { MovesClient } from "@/components/MovesClient";

export default function MovesPage() {
  return (
    <AppShell section="movement" tab="list">
      <MovesClient />
    </AppShell>
  );
}
