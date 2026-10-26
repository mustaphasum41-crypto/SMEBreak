import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActiveBoard } from "@/components/ActiveBoard";
import { HistoryView } from "@/components/HistoryView";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errMsg, useActiveBreaks } from "@/lib/data";
import { FLOORS, FLOOR_CAPACITY, floorLabel } from "@/lib/breaks";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const qc = useQueryClient();
  const { data: active } = useActiveBreaks();
  const [busy, setBusy] = useState(false);

  async function clearAll() {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_clear_active");
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Cleared ${data ?? 0} active break(s). They were saved to history.`);
    qc.invalidateQueries({ queryKey: ["breaks"] });
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-3">
        {FLOORS.map((f) => {
          const n = (active ?? []).filter((b) => b.floor === f).length;
          return (
            <div key={f} className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">{floorLabel(f)}</p>
              <p className="text-3xl font-bold">{n} <span className="text-base font-normal text-muted-foreground">/ {FLOOR_CAPACITY} on break</span></p>
            </div>
          );
        })}
        <div className="flex items-center rounded-xl border bg-card p-4 shadow-card">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" className="w-full" disabled={busy || !active?.length}>
                <XCircle /> Clear all active breaks
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all active breaks?</AlertDialogTitle>
                <AlertDialogDescription>
                  All {active?.length ?? 0} active breaks will be ended now and saved to history as "Admin (cleared)".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Active breaks</h2>
        <ActiveBoard admin />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Break history</h2>
        <HistoryView allowDate />
      </section>
    </div>
  );
}
