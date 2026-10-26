import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActiveBoard } from "@/components/ActiveBoard";
import { StartBreakForm } from "@/components/StartBreakForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Break Dashboard · SME Break Tracker" },
      { name: "description", content: "Live view of SMEs on break across the 3rd and 4th floors." },
      { property: "og:title", content: "Break Dashboard · SME Break Tracker" },
      { property: "og:description", content: "Live view of SMEs on break across the 3rd and 4th floors." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active breaks</h1>
          <p className="text-muted-foreground">Updates live for everyone. Max 4 per floor.</p>
        </div>
        <Button asChild size="lg" className="lg:hidden">
          <Link to="/start"><PlusCircle /> Start a break</Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ActiveBoard />
        <Card className="hidden self-start shadow-card lg:block">
          <CardHeader>
            <CardTitle>Start a break</CardTitle>
          </CardHeader>
          <CardContent>
            <StartBreakForm />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
