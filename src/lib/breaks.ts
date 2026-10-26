export type BreakType = "short" | "lunch";
export type Floor = 3 | 4;
export type DurationStatus = "normal" | "alarming" | "excessive";

export const FLOORS: Floor[] = [3, 4];
export const FLOOR_CAPACITY = 4;

export const BREAK_RULES: Record<BreakType, { label: string; normalMax: number; alarmingMax: number }> = {
  short: { label: "Short Break", normalMax: 20, alarmingMax: 25 },
  lunch: { label: "Lunch Break", normalMax: 60, alarmingMax: 70 },
};

export const STATUS_LABEL: Record<DurationStatus, string> = {
  normal: "Normal",
  alarming: "Slightly alarming",
  excessive: "Excessive",
};

export function floorLabel(f: number) {
  return f === 3 ? "3rd Floor" : "4th Floor";
}

/** Status from elapsed milliseconds. Boundaries are inclusive: exactly 20:00 is still normal. */
export function statusFor(type: BreakType, elapsedMs: number): DurationStatus {
  const r = BREAK_RULES[type];
  const minutes = elapsedMs / 60000;
  if (minutes <= r.normalMax) return "normal";
  if (minutes <= r.alarmingMax) return "alarming";
  return "excessive";
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatTime(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
