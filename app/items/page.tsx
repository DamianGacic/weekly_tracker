import { AppShell } from "@/components/AppShell";
import { ItemsClient } from "@/components/ItemsClient";

export default function ItemsPage() {
  return (
    <AppShell section="macros" tab="list">
      <ItemsClient />
    </AppShell>
  );
}
