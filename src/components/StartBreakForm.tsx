import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coffee, Play, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BREAK_RULES, FLOORS, FLOOR_CAPACITY, floorLabel, type BreakType } from "@/lib/breaks";
import { errMsg, useActiveBreaks, useSmes, type BreakRow } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {title}
      </p>
      {children}
    </div>
  );
}

export function StartBreakForm({ onStarted }: { onStarted?: () => void }) {
  const qc = useQueryClient();
  const { data: smes } = useSmes();
  const { data: active } = useActiveBreaks();
  const [smeId, setSmeId] = useState("");
  const [floor, setFloor] = useState<number | null>(null);
  const [type, setType] = useState<BreakType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeSmes = (smes ?? []).filter((s) => s.active);
  const onBreak = new Set((active ?? []).map((b) => b.sme_id));
  const used = (f: number) => (active ?? []).filter((b) => b.floor === f).length;
  const smeBusy = smeId && onBreak.has(smeId);
  const floorFull = floor !== null && used(floor) >= FLOOR_CAPACITY;

  async function submit() {
    setError(null);
    if (!smeId) return setError("Please select an SME.");
    if (floor === null) return setError("Please select a floor.");
    if (!type) return setError("Please select a break type.");
    setBusy(true);
    const { data, error } = await supabase.rpc("start_break", { _sme_id: smeId, _floor: floor, _break_type: type });
    setBusy(false);
    if (error) {
      setError(errMsg(error));
      toast.error(errMsg(error));
      return;
    }
    const r = data as unknown as BreakRow;
    toast.success(`${r.sme_name} is on ${BREAK_RULES[r.break_type].label.toLowerCase()}`, {
      description: floorLabel(r.floor),
    });
    setSmeId("");
    setFloor(null);
    setType(null);
    qc.invalidateQueries({ queryKey: ["breaks"] });
    onStarted?.();
  }

  return (
    <div className="space-y-6">
      <Step n={1} title="Select SME">
        <Select value={smeId} onValueChange={(v) => { setSmeId(v); setError(null); }}>
          <SelectTrigger className="h-14 text-base">
            <SelectValue placeholder="Choose an SME…" />
          </SelectTrigger>
          <SelectContent>
            {activeSmes.map((s) => (
              <SelectItem key={s.id} value={s.id} disabled={onBreak.has(s.id)}>
                {s.name} {onBreak.has(s.id) && "· on break"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {smeBusy && <p className="mt-2 text-sm text-danger">This SME already has an active break.</p>}
      </Step>

      <Step n={2} title="Select floor">
        <div className="grid grid-cols-2 gap-3">
          {FLOORS.map((f) => {
            const u = used(f);
            return (
              <Button
                key={f}
                type="button"
                variant="choice"
                size="xl"
                data-selected={floor === f}
                onClick={() => { setFloor(f); setError(null); }}
                className="h-auto flex-col py-4"
              >
                <span>{floorLabel(f)}</span>
                <span className={u >= FLOOR_CAPACITY ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
                  {u} of {FLOOR_CAPACITY} spots used
                </span>
              </Button>
            );
          })}
        </div>
        {floorFull && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>
              {floorLabel(floor!)} is full. Wait for someone to return or pick the other floor.
            </AlertDescription>
          </Alert>
        )}
      </Step>

      <Step n={3} title="Select break type">
        <div className="grid grid-cols-2 gap-3">
          {(["short", "lunch"] as BreakType[]).map((t) => {
            const Icon = t === "lunch" ? UtensilsCrossed : Coffee;
            return (
              <Button
                key={t}
                type="button"
                variant="choice"
                size="xl"
                data-selected={type === t}
                onClick={() => { setType(t); setError(null); }}
                className="h-auto flex-col py-4"
              >
                <span className="flex items-center gap-2"><Icon /> {BREAK_RULES[t].label}</span>
                <span className="text-xs text-muted-foreground">Up to {BREAK_RULES[t].normalMax} min</span>
              </Button>
            );
          })}
        </div>
      </Step>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button size="xl" className="w-full" onClick={submit} disabled={busy || !!smeBusy || floorFull}>
        <Play /> {busy ? "Starting…" : "Start break"}
      </Button>
    </div>
  );
}
