import { useEffect, useMemo, useState } from "react";
import { BREAK_RULES, floorLabel, formatDuration, formatTime, statusFor, todayIn } from "@/lib/breaks";
import { useHistory, useSettings } from "@/lib/data";
import { StatusBadge } from "@/components/breaks";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoryView({ allowDate = false }: { allowDate?: boolean }) {
  const { data: settings } = useSettings();
  const tz = settings?.timezone;
  const [date, setDate] = useState<string>();
  const [floor, setFloor] = useState("all");
  const [type, setType] = useState("all");
  const [sme, setSme] = useState("all");

  useEffect(() => {
    if (tz && !date) setDate(todayIn(tz));
  }, [tz, date]);

  const { data, isLoading } = useHistory(date);
  const smeNames = useMemo(() => [...new Set((data ?? []).map((b) => b.sme_name))].sort(), [data]);
  const rows = (data ?? []).filter(
    (b) =>
      (floor === "all" || String(b.floor) === floor) &&
      (type === "all" || b.break_type === type) &&
      (sme === "all" || b.sme_name === sme),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {allowDate ? (
          <Input type="date" value={date ?? ""} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-11" aria-label="Date" />
        ) : (
          <div className="flex h-11 items-center rounded-md border bg-card px-3 text-sm">
            Today · {date ?? "…"}
          </div>
        )}
        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger className="h-11" aria-label="Floor"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All floors</SelectItem>
            <SelectItem value="3">3rd Floor</SelectItem>
            <SelectItem value="4">4th Floor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sme} onValueChange={setSme}>
          <SelectTrigger className="h-11" aria-label="SME"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SMEs</SelectItem>
            {smeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-11" aria-label="Break type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All break types</SelectItem>
            <SelectItem value="short">Short Break</SelectItem>
            <SelectItem value="lunch">Lunch Break</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {isLoading || !date ? (
          <Skeleton className="m-4 h-32" />
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No completed breaks match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SME</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ended by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const ms = new Date(b.ended_at!).getTime() - new Date(b.started_at).getTime();
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.sme_name}</TableCell>
                      <TableCell>{floorLabel(b.floor)}</TableCell>
                      <TableCell>{BREAK_RULES[b.break_type].label}</TableCell>
                      <TableCell className="font-mono">{formatTime(b.started_at, tz)}</TableCell>
                      <TableCell className="font-mono">{formatTime(b.ended_at!, tz)}</TableCell>
                      <TableCell className="font-mono">{formatDuration(ms)}</TableCell>
                      <TableCell><StatusBadge status={statusFor(b.break_type, ms)} /></TableCell>
                      <TableCell className="text-muted-foreground">{b.ended_by ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} completed break{rows.length === 1 ? "" : "s"}</p>
    </div>
  );
}
