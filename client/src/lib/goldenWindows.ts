/** Folded from Golden Time page — P1-3. */

export type GoldenWindow = {
  start: string;
  end: string;
  label: string;
  labelEn: string;
};

export const GOLDEN_WINDOWS: GoldenWindow[] = [
  { start: "09:30", end: "10:30", label: "早会后", labelEn: "After standup" },
  { start: "11:30", end: "12:00", label: "午饭前", labelEn: "Before lunch" },
  { start: "14:00", end: "15:30", label: "午后困倦", labelEn: "Afternoon slump" },
  { start: "16:30", end: "17:30", label: "下班前", labelEn: "Before clock-out" },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getActiveGoldenWindow(now = new Date()): GoldenWindow | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  return (
    GOLDEN_WINDOWS.find(w => {
      const s = toMinutes(w.start);
      const e = toMinutes(w.end);
      return mins >= s && mins <= e;
    }) || null
  );
}

export function getNextGoldenWindow(now = new Date()): GoldenWindow | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const upcoming = GOLDEN_WINDOWS.find(w => toMinutes(w.start) > mins);
  return upcoming || GOLDEN_WINDOWS[0] || null;
}
