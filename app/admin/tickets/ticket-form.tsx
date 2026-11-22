"use client";

import { useActionState, useState } from "react";
import { createTicket, updateTicket } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { TIERS } from "@/lib/utils";

const QUICK_SLOTS = [1, 2, 5, 10, 20];

export type TicketFormValues = {
  id?: string;
  buyer_name: string;
  buyer_phone: string;
  tier: string;
  slots: number;
  amount_paid: number;
  guest_names: string[];
};

export function TicketForm({ initial, minSlots = 1 }: { initial?: TicketFormValues; minSlots?: number }) {
  const editing = Boolean(initial?.id);
  const [state, action] = useActionState(editing ? updateTicket : createTicket, undefined);
  const [tier, setTier] = useState(initial?.tier ?? "Regular");
  const [slots, setSlots] = useState(String(initial?.slots ?? 1));
  const [showNames, setShowNames] = useState((initial?.guest_names.length ?? 0) > 0);

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="buyer_name">Buyer&apos;s name</label>
          <input id="buyer_name" name="buyer_name" required defaultValue={initial?.buyer_name} className="input" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="buyer_phone">WhatsApp number</label>
          <input
            id="buyer_phone"
            name="buyer_phone"
            type="tel"
            inputMode="tel"
            required
            defaultValue={initial?.buyer_phone}
            className="input"
            placeholder="0803 123 4567"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="card space-y-4">
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
        </div>

        <div>
          <label className="label" htmlFor="slots">Number of people (slots)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {QUICK_SLOTS.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setSlots(String(n))}
                disabled={n < minSlots}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-30 ${
                  slots === String(n) ? "border-accent text-accent" : "border-line text-muted"
                }`}
              >
                {n === 1 ? "Single" : `${n}-man`}
              </button>
            ))}
          </div>
          <input
            id="slots"
            name="slots"
            type="number"
            inputMode="numeric"
            min={minSlots}
            required
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
            className="input"
          />
          {minSlots > 1 && (
            <p className="mt-1 text-xs text-muted">{minSlots} already admitted, so it can&apos;t go lower.</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="amount_paid">Amount paid (₦)</label>
          <input
            id="amount_paid"
            name="amount_paid"
            inputMode="numeric"
            required
            defaultValue={initial ? String(initial.amount_paid) : ""}
            className="input"
            placeholder="e.g. 50000"
          />
        </div>
      </div>

      <div className="card">
        {showNames ? (
          <div>
            <label className="label" htmlFor="guest_names">Guest names (optional, one per line)</label>
            <textarea
              id="guest_names"
              name="guest_names"
              rows={4}
              defaultValue={initial?.guest_names.join("\n")}
              className="input"
              placeholder={"Ada\nTunde\nChioma"}
            />
            <p className="mt-1 text-xs text-muted">Leave empty to just use slot numbers. You can tick names at the gate.</p>
          </div>
        ) : (
          <button type="button" onClick={() => setShowNames(true)} className="text-sm font-medium text-accent">
            + Add guest names (optional)
          </button>
        )}
      </div>

      <FormMessage state={state} />
      <SubmitButton pendingText={editing ? "Saving…" : "Generating…"} className="btn-primary w-full py-4 text-base">
        {editing ? "Save changes" : "Generate ticket"}
      </SubmitButton>
    </form>
  );
}
