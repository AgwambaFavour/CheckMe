"use client";

import { useMemo, useState, useTransition } from "react";
import { admitGuests, type LookupResult } from "@/app/actions/admin";
import { formatTime } from "@/lib/utils";

type Found = Extract<LookupResult, { ok: true }>;

export function CheckinPanel({
  data,
  onAdmitted,
}: {
  data: Found;
  onAdmitted?: (result: { admitted: number; remaining: number; count: number }) => void;
}) {
  const { ticket, checkins } = data;
  const [count, setCount] = useState(Math.min(1, ticket.remaining));
  const [picked, setPicked] = useState<string[]>([]);
  const [extraName, setExtraName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const admittedNames = useMemo(() => new Set(checkins.flatMap((c) => c.names)), [checkins]);
  const waitingNames = ticket.guest_names.filter((n) => !admittedNames.has(n));
  const blocked = ticket.status === "void" || ticket.remaining <= 0;

  const togglePick = (name: string) => {
    const next = picked.includes(name) ? picked.filter((n) => n !== name) : [...picked, name];
    setPicked(next);
    setCount((c) => Math.min(ticket.remaining, Math.max(c, next.length)));
  };

  const admit = () => {
    setError(null);
    const names = [...picked, ...(extraName.trim() ? [extraName.trim()] : [])];
    if (names.length > count) {
      setError(`You picked ${names.length} names but are admitting ${count}.`);
      return;
    }
    startTransition(async () => {
      const res = await admitGuests(ticket.id, count, names);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdmitted?.({ admitted: res.admitted, remaining: res.remaining, count });
    });
  };

  return (
    <div className="space-y-4">
      {/* Big status numbers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Num label="Paid for" value={ticket.slots} />
        <Num label="Already in" value={ticket.admitted} />
        <Num label="Remaining" value={ticket.remaining} highlight={!blocked} />
      </div>

      {checkins.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Already admitted</div>
          <ul className="space-y-1 text-sm">
            {checkins.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>
                  <b>{c.count}</b> {c.count === 1 ? "person" : "people"}
                  {c.names.length > 0 && <span className="text-muted"> — {c.names.join(", ")}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatTime(c.created_at)}
                  {c.admitted_by_name && ` · ${c.admitted_by_name}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ticket.status === "void" ? (
        <Banner tone="danger">This ticket has been VOIDED. Do not admit.</Banner>
      ) : ticket.remaining <= 0 ? (
        <Banner tone="danger">All {ticket.slots} slots have been used. Do not admit.</Banner>
      ) : (
        <>
          <div>
            <div className="mb-2 text-sm font-medium text-muted">How many are coming in now?</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(Math.max(1, picked.length), c - 1))}
                className="btn-secondary h-14 w-14 text-2xl"
                aria-label="Fewer"
              >
                −
              </button>
              <div className="flex-1 text-center text-5xl font-black tabular-nums">{count}</div>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(ticket.remaining, c + 1))}
                className="btn-secondary h-14 w-14 text-2xl"
                aria-label="More"
              >
                +
              </button>
            </div>
            {ticket.remaining > 1 && (
              <button
                type="button"
                onClick={() => setCount(ticket.remaining)}
                className="mt-2 w-full text-center text-sm font-medium text-accent"
              >
                Admit all {ticket.remaining} remaining
              </button>
            )}
          </div>

          {waitingNames.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium text-muted">Tick who is here (optional)</div>
              <div className="flex flex-wrap gap-2">
                {waitingNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => togglePick(n)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      picked.includes(n) ? "border-accent bg-accent text-accent-ink" : "border-line"
                    }`}
                  >
                    {picked.includes(n) ? "✓ " : ""}
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            placeholder="Add a name (optional)"
            className="input py-2.5 text-sm"
          />

          {error && <Banner tone="danger">{error}</Banner>}

          <button type="button" onClick={admit} disabled={pending} className="btn w-full bg-ok py-5 text-lg text-white">
            {pending ? "Admitting…" : `✓ Admit ${count} ${count === 1 ? "person" : "people"}`}
          </button>
        </>
      )}
    </div>
  );
}

function Num({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${highlight ? "border-accent/50 bg-accent/10" : "border-line bg-surface-2"}`}>
      <div className={`text-3xl font-black tabular-nums ${highlight ? "text-accent" : ""}`}>{value}</div>
      <div className="text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}

export function Banner({ tone, children }: { tone: "danger" | "ok" | "warn"; children: React.ReactNode }) {
  const styles = {
    danger: "border-danger/50 bg-danger/15 text-danger",
    ok: "border-ok/50 bg-ok/15 text-ok",
    warn: "border-warn/50 bg-warn/15 text-warn",
  }[tone];
  return <div className={`rounded-xl border px-3.5 py-3 text-sm font-semibold ${styles}`}>{children}</div>;
}
