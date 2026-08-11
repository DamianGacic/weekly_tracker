import { AppHeader } from "@/components/AppHeader";
import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="min-h-svh">
      <AppHeader active="week" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <DashboardClient />
      </main>
    </div>
  );
}
