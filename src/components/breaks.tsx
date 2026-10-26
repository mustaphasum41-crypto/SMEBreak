import { AlertTriangle, Clock, Coffee, Square, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BREAK_RULES,
  FLOOR_CAPACITY,
  STATUS_LABEL,
  floorLabel,
  formatDuration,
  formatTime,
  statusFor,
  type DurationStatus,
} from "@/lib/breaks";
import type { BreakRow } from "@/lib/data";

const statusStyles: Record<DurationStatus, string> = {
  normal: "bg-success-soft text-success border-success/30",
  alarming: "bg-warning-soft text-warning border-warning/40",
  excessive: "bg-danger-soft text-danger border-danger/40",
};

export function StatusBadge({ status }: { status: DurationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      {status !== "normal" && <AlertTriangle className="size-3" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CapacityMeter({ used }: { used: number }) {
  const full = used >= FLOOR_CAPACITY;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: FLOOR_CAPACITY }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-6 rounded-full",
              i < used ? (full ? "bg-danger" : "bg-primary") : "bg-muted-foreground/20",
            )}
          />
        ))}
      </div>
      <span className={cn("text-sm font-medium", full ? "text-danger" : "text-muted-foreground")}>
        {used} of {FLOOR_CAPACITY} spots used{full && " · Full"}
      </span>
    </div>
  );
}

export function BreakCard({
  b,
  now,
  timeZone,
  onEnd,
  onRemove,
  busy,
}: {
  b: BreakRow;
  now: number | null;
  timeZone?: string;
  onEnd?: () => void;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const elapsed = now ? now - new Date(b.started_at).getTime() : 0;
  const status = statusFor(b.break_type, elapsed);
  const rule = BREAK_RULES[b.break_type];
  const remaining = rule.normalMax * 60000 - elapsed;
  const Icon = b.break_type === "lunch" ? UtensilsCrossed : Coffee;
  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card p-4 shadow-card transition-colors",
        status === "normal" && "border-border",
        status === "alarming" && "border-warning/60",
        status === "excessive" && "border-danger/70 animate-alert",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{b.sme_name}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="size-3.5" /> {rule.label} · {floorLabel(b.floor)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-3xl font-bold tabular-nums">{now ? formatDuration(elapsed) : "--:--"}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Started {formatTime(b.started_at, timeZone)} ·{" "}
            {remaining > 0 ? `${formatDuration(remaining)} left` : `${formatDuration(-remaining)} over`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {onRemove && (
            <Button variant="ghost" size="icon" onClick={onRemove} disabled={busy} aria-label="Remove break">
              <Trash2 />
            </Button>
          )}
          {onEnd && (
            <Button onClick={onEnd} disabled={busy}>
              <Square /> End
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FloorSection({
  floor,
  breaks,
  children,
}: {
  floor: number;
  breaks: BreakRow[];
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-muted/50 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{floorLabel(floor)}</h2>
        <CapacityMeter used={breaks.length} />
      </div>
      {breaks.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-card/60 p-8 text-center text-sm text-muted-foreground">
          No SMEs are on break on this floor.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      )}
    </section>
  );
}
