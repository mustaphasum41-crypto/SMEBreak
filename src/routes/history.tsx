import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HistoryView } from "@/components/HistoryView";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Daily Break History · SME Break Tracker" },
      { name: "description", content: "Today's completed breaks by floor, SME and break type." },
      { property: "og:title", content: "Daily Break History · SME Break Tracker" },
      { property: "og:description", content: "Today's completed breaks by floor, SME and break type." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <AppShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Daily break history</h1>
      <p className="mb-6 text-muted-foreground">Completed breaks for today. Resets at midnight.</p>
      <HistoryView />
    </AppShell>
  );
}
