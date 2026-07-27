import type { Origin } from "@/lib/store";
import { useStore } from "@/lib/store";

// Paleta cíclica para tons das colunas (já que são dinâmicas).
const COLUMN_TONES = [
  "bg-muted text-muted-foreground",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
];

export function StageBadge({ stage, short }: { stage: string; short?: boolean }) {
  const columns = useStore((s) => s.columns);
  const col = columns.find((c) => c.id === stage);
  const idx = columns.findIndex((c) => c.id === stage);
  const tone = COLUMN_TONES[idx >= 0 ? idx % COLUMN_TONES.length : 0];
  const label = col?.label ?? stage;
  const text = short && label.length > 16 ? label.slice(0, 16).trimEnd() + "…" : label;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {text}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: Origin }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        origin === "china"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      }`}
    >
      {origin === "china" ? "🇨🇳 China" : "🇧🇷 Nacional"}
    </span>
  );
}
