import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FLOORS, formatDuration } from "@/lib/breaks";
import { errMsg, useActiveBreaks, useServerNow, useSettings, type BreakRow } from "@/lib/data";
import { BreakCard, FloorSection } from "@/components/breaks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function ActiveBoard({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const { data: breaks, isLoading } = useActiveBreaks();
  const { data: settings } = useSettings();
  const now = useServerNow();
  const [ending, setEnding] = useState<BreakRow | null>(null);
  const [removing, setRemoving] = useState<BreakRow | null>(null);
  const [endedBy, setEndedBy] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmEnd() {
    if (!ending) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("end_break", { _break_id: ending.id, _ended_by: endedBy });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    const r = data as unknown as BreakRow;
    const dur = new Date(r.ended_at!).getTime() - new Date(r.started_at).getTime();
    toast.success(`${r.sme_name}'s break ended`, { description: `Total duration ${formatDuration(dur)}` });
    setEnding(null);
    qc.invalidateQueries({ queryKey: ["breaks"] });
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_remove_break", { _break_id: removing.id });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Break removed for ${removing.sme_name}`);
    setRemoving(null);
    qc.invalidateQueries({ queryKey: ["breaks"] });
  }

  if (isLoading)
    return (
      <div className="grid gap-4 2xl:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );

  return (
    <>
      <div className="grid gap-4 2xl:grid-cols-2">
        {FLOORS.map((f) => {
          const list = (breaks ?? []).filter((b) => b.floor === f);
          return (
            <FloorSection key={f} floor={f} breaks={list}>
              {list.map((b) => (
                <BreakCard
                  key={b.id}
                  b={b}
                  now={now}
                  timeZone={settings?.timezone}
                  busy={busy}
                  onEnd={() => {
                    setEndedBy(admin ? "Admin" : "");
                    setEnding(b);
                  }}
                  onRemove={admin ? () => setRemoving(b) : undefined}
                />
              ))}
            </FloorSection>
          );
        })}
      </div>

      <AlertDialog open={!!ending} onOpenChange={(o) => !o && setEnding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {ending?.sme_name}'s break?</AlertDialogTitle>
            <AlertDialogDescription>The end time is recorded by the server right now.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ended-by">Ended by (optional)</Label>
            <Input
              id="ended-by"
              value={endedBy}
              maxLength={80}
              placeholder="Your name"
              onChange={(e) => setEndedBy(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                confirmEnd();
              }}
            >
              End break
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this break?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.sme_name}'s break will be deleted entirely and won't appear in history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                confirmRemove();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
