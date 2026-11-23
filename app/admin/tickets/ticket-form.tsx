"use client";

import { useActionState, useState } from "react";
import { createTicket, updateTicket } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { formatNaira, parseNames, TIERS } from "@/lib/utils";
import { pickContacts, useContactPicker } from "@/lib/contacts";
import { BuyerPicker } from "@/components/buyer-picker";

const QUICK_SLOTS = [1, 2, 5, 10, 20, 50, 100];

export type TicketFormValues = {
  id?: string;
  buyer_name: string;
  buyer_phone: string;
  tier: string;
  slots: number;
  amount_paid: number;
  guest_names: string[];
};

export function TicketForm({
  initial,
  minSlots = 1,
  prices = {},
  pricesHref,
}: {
  initial?: TicketFormValues;
  minSlots?: number;
  /** Price per person for each tier, from the event. */
  prices?: Partial<Record<string, number>>;
  /** Where to set the event's prices (owners only). */
  pricesHref?: string;
}) {
  const editing = Boolean(initial?.id);
  const [state, action] = useActionState(editing ? updateTicket : createTicket, undefined);
  const [tier, setTier] = useState(initial?.tier ?? "Regular");
  const [slots, setSlots] = useState(String(initial?.slots ?? 1));
  const [showNames, setShowNames] = useState((initial?.guest_names.length ?? 0) > 0);
  const [buyerName, setBuyerName] = useState(initial?.buyer_name ?? "");
  const [buyerPhone, setBuyerPhone] = useState(initial?.buyer_phone ?? "");
  const [guestNames, setGuestNames] = useState(initial?.guest_names.join("\n") ?? "");
  const canPick = useContactPicker();
  const [amount, setAmount] = useState(initial ? String(initial.amount_paid) : "");
  // New tickets follow the price list until someone types an amount; edits keep what was paid.
  const [autoAmount, setAutoAmount] = useState(!editing);

  const slotsNum = parseInt(slots, 10);
  // Price per person comes from the event's price list (set on the Events page).
  const unitPrice = prices[tier] ?? 0;
  const suggested = unitPrice > 0 && slotsNum > 0 ? unitPrice * slotsNum : null;
  const amountValue = autoAmount && suggested !== null ? String(suggested) : amount;

  const pickGuests = async () => {
    const picked = (await pickContacts(true)).map((c) => c.name).filter(Boolean);
    if (picked.length === 0) return;
    const existing = parseNames(guestNames);
    const all = [...existing, ...picked.filter((n) => !existing.includes(n))];
    setGuestNames(all.join("\n"));
    setShowNames(true);
    // Make room for everyone picked.
    if (all.length > (parseInt(slots, 10) || 0)) setSlots(String(all.length));
  };

  return (
    <form action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="card">
        <BuyerPicker name={buyerName} phone={buyerPhone} onName={setBuyerName} onPhone={setBuyerPhone} />
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
                <span className="block">{t}</span>
                <span className={`block text-xs font-medium ${tier === t ? "opacity-80" : "text-muted"}`}>
                  {prices[t] ? formatNaira(prices[t]!) : "No price"}
                </span>
              </button>
            ))}
          </div>
          {!prices[tier] && (
            <p className="mt-1 text-xs text-muted">
              No {tier} price set for this event.{" "}
              {pricesHref ? (
                <a href={pricesHref} className="font-medium text-accent">Set ticket prices</a>
              ) : (
                "Ask the owner to set ticket prices, or type the amount below."
              )}
            </p>
          )}
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
            value={amountValue}
            onChange={(e) => {
              setAmount(e.target.value);
              if (suggested !== null) setAutoAmount(false);
            }}
            className="input"
            placeholder="e.g. 50000"
          />
          {suggested !== null ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>
                {tier} price: {formatNaira(unitPrice)} × {slotsNum} = <span className="text-ink">{formatNaira(suggested)}</span>
              </span>
              {amountValue.replace(/[^\d]/g, "") !== String(suggested) && (
                <button type="button" onClick={() => setAutoAmount(true)} className="font-medium text-accent">
                  Use {formatNaira(suggested)}
                </button>
              )}
            </p>
          ) : (
            editing && <p className="mt-1 text-xs text-muted">No price set for {tier}. Type the amount.</p>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        {showNames ? (
          <div>
            <label className="label" htmlFor="guest_names">Guest names (optional, one per line)</label>
            <textarea
              id="guest_names"
              name="guest_names"
              rows={4}
              value={guestNames}
              onChange={(e) => setGuestNames(e.target.value)}
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
        {canPick && (
          <button type="button" onClick={pickGuests} className="btn-secondary w-full text-sm">
            👥 Add guests from contacts
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
