import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StartBreakForm } from "@/components/StartBreakForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start a Break · SME Break Tracker" },
      { name: "description", content: "Pick an SME, floor and break type to start a timed break." },
      { property: "og:title", content: "Start a Break · SME Break Tracker" },
      { property: "og:description", content: "Pick an SME, floor and break type to start a timed break." },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <Card className="mx-auto max-w-lg shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">Start a break</CardTitle>
        </CardHeader>
        <CardContent>
          <StartBreakForm onStarted={() => navigate({ to: "/" })} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
