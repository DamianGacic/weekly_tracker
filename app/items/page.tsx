import { AppHeader } from "@/components/AppHeader";
import { ItemsClient } from "@/components/ItemsClient";

export default function ItemsPage() {
  return (
    <div className="min-h-svh">
      <AppHeader active="items" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <ItemsClient />
      </main>
    </div>
  );
}
