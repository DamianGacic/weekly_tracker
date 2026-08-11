import { AppHeader } from "@/components/AppHeader";
import { HistoryClient } from "@/components/HistoryClient";

export default function HistoryPage() {
  return (
    <div className="min-h-svh">
      <AppHeader active="history" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <HistoryClient />
      </main>
    </div>
  );
}
