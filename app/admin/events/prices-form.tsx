"use client";

import { useActionState } from "react";
import { setTicketPrices } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { TIERS } from "@/lib/utils";

/** Price per person for each ticket type on the selected event. */
export function PricesForm({ eventId, prices }: { eventId: string; prices: Partial<Record<string, number>> }) {
  const [state, action] = useActionState(setTicketPrices, undefined);
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="id" value={eventId} />
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((tier) => (
          <div key={tier}>
            <label className="label" htmlFor={`price_${tier}`}>{tier}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₦</span>
              <input
                id={`price_${tier}`}
                name={`price_${tier}`}
                inputMode="numeric"
                defaultValue={prices[tier] ? String(prices[tier]) : ""}
                className="input pl-7"
                placeholder="0"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Price for <b>one person</b>. When generating a ticket, tap the type and the number of people, and the amount
        is worked out for you (e.g. 10-man Regular at ₦5,000 = ₦50,000).
      </p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save prices</SubmitButton>
    </form>
  );
}
