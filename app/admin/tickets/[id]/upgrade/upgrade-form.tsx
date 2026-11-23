"use client";

import { useActionState, useState } from "react";
import { upgradeTicket } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { formatNaira, TIERS } from "@/lib/utils";

const QUICK_ADD = [1, 2, 5, 10, 20];

export function UpgradeForm({
  ticket,
  prices,
}: {
  ticket: { id: string; tier: string; slots: number; amount_paid: number };
  prices: Partial<Record<string, number>>;
}) {
  const [state, action] = useActionState(upgradeTicket, undefined);
  const [tier, setTier] = useState(ticket.tier);
  const [added, setAdded] = useState("0");
  const [extra, setExtra] = useState("");
  // Follow the price list until someone types an amount.
  const [autoExtra, setAutoExtra] = useState(true);

  const addedNum = Math.max(0, parseInt(added, 10) || 0);
  const newPrice = prices[tier];
  const oldPrice = prices[ticket.tier];
  // New people pay the new price; if the type changes, existing people pay the difference.
  const suggested =
    newPrice !== undefined && (tier === ticket.tier || oldPrice !== undefined)
      ? Math.max(0, addedNum * newPrice + (tier === ticket.tier ? 0 : ticket.slots * (newPrice - (oldPrice ?? 0))))
      : null;
  const extraValue = autoExtra && suggested !== null ? String(suggested) : extra;
  const extraNum = parseInt(extraValue.replace(/[^\d]/g, ""), 10) || 0;
  const changed = addedNum > 0 || tier !== ticket.tier;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={ticket.id} />

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="added_slots">People to add</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {QUICK_ADD.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setAdded(String(n))}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  added === String(n) ? "border-accent text-accent" : "border-line text-muted"
                }`}
              >
                +{n}
              </button>
            ))}
          </div>
          <input
            id="added_slots"
            name="added_slots"
            type="number"
            inputMode="numeric"
            min={0}
            required
            value={added}
            onChange={(e) => setAdded(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <span className="label">Ticket type</span>
          <input type="hidden" name="tier" value={tier} />
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTier(t)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  tier === t ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tier !== ticket.tier && (
            <p className="mt-1 text-xs text-muted">All {ticket.slots + addedNum} people move from {ticket.tier} to {tier}.</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="extra_amount">Extra amount paid (₦)</label>
          <input
            id="extra_amount"
            name="extra_amount"
            inputMode="numeric"
            required
            value={extraValue}
            onChange={(e) => {
              setExtra(e.target.value);
              if (suggested !== null) setAutoExtra(false);
            }}
            className="input"
            placeholder="e.g. 25000"
          />
          {suggested !== null && extraNum !== suggested && (
            <button type="button" onClick={() => setAutoExtra(true)} className="mt-1 text-xs font-medium text-accent">
              Use price list: {formatNaira(suggested)}
            </button>
          )}
          {suggested === null && changed && (
            <p className="mt-1 text-xs text-muted">No price set for {tier}{tier !== ticket.tier ? ` or ${ticket.tier}` : ""}. Type the amount.</p>
          )}
        </div>
      </div>

      {changed && (
        <div className="card text-sm">
          <div className="mb-1 font-semibold">After the upgrade</div>
          <div className="flex justify-between">
            <span className="text-muted">People</span>
            <span>{ticket.slots} → <b>{ticket.slots + addedNum}</b></span>
          </div>
          {tier !== ticket.tier && (
            <div className="flex justify-between">
              <span className="text-muted">Type</span>
              <span>{ticket.tier} → <b>{tier}</b></span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Total paid</span>
            <span>{formatNaira(ticket.amount_paid)} → <b>{formatNaira(ticket.amount_paid + extraNum)}</b></span>
          </div>
        </div>
      )}

      <FormMessage state={state} />
      <SubmitButton pendingText="Upgrading…" className="btn-primary w-full py-4 text-base">
        Upgrade ticket
      </SubmitButton>
      <p className="text-center text-xs text-muted">Only upgrade after the extra payment is confirmed.</p>
    </form>
  );
}
