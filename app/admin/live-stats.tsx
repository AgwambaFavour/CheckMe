"use client";

import { useEffect, useState } from "react";
import { getStats } from "@/app/actions/admin";
import { formatNaira } from "@/lib/utils";

type Stats = Awaited<ReturnType<typeof getStats>>;

export function LiveStats({
  initial,
  capacity,
  eventId,
}: {
  initial: Stats;
  capacity: number | null;
  eventId: string;
}) {
  const [stats, setStats] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await getStats();
        if (alive && next) {
          setStats(next);
          setUpdatedAt(new Date());
        }
      } catch {
        /* offline for a moment — keep last numbers */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eventId]);

  if (!stats) return null;
  const toArrive = Math.max(0, stats.slots - stats.admitted);
  const pct = stats.slots ? Math.round((stats.admitted / stats.slots) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Checked in</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" /> Live
            {updatedAt && ` · ${updatedAt.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-6xl font-black tabular-nums text-accent">{stats.admitted}</span>
          <span className="text-lg text-muted tabular-nums">/ {stats.slots}</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 text-xs text-muted">{pct}% of ticketed guests have arrived</div>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${stats.revenue === null ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
        <Stat label="Still to arrive" value={toArrive} />
        <Stat label="Tickets generated" value={stats.tickets} />
        <Stat label="People ticketed" value={stats.slots} hint={capacity ? `of ${capacity} capacity` : undefined} />
        {stats.revenue !== null && <Stat label="Revenue" value={formatNaira(stats.revenue)} />}
      </div>

      {stats.by_tier.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 text-right font-medium">Tickets</th>
                <th className="pb-2 text-right font-medium">People</th>
                <th className="pb-2 text-right font-medium">Arrived</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {stats.by_tier.map((t) => (
                <tr key={t.tier} className="border-t border-line">
                  <td className="py-2 font-medium">{t.tier}</td>
                  <td className="py-2 text-right">{t.tickets}</td>
                  <td className="py-2 text-right">{t.slots}</td>
                  <td className="py-2 text-right">{t.admitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stats.voided > 0 && <p className="text-xs text-muted">{stats.voided} voided ticket(s) not counted.</p>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
