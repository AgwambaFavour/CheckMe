"use client";

import { useActionState } from "react";
import { createEvent, updateEvent } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { TIERS } from "@/lib/utils";

type Values = {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  capacity: string;
  whatsapp_template: string;
};

export function EventForm({ mode, initial }: { mode: "create" | "edit"; initial?: Values }) {
  const [state, action] = useActionState(mode === "edit" ? updateEvent : createEvent, undefined);
  return (
    <form action={action} className="card space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="label" htmlFor={`${mode}-name`}>Event name</label>
        <input id={`${mode}-name`} name="name" required defaultValue={initial?.name} className="input" placeholder="e.g. Owambe Night 2026" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${mode}-starts_at`}>Date &amp; time</label>
          <input id={`${mode}-starts_at`} name="starts_at" type="datetime-local" defaultValue={initial?.starts_at} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`${mode}-capacity`}>Capacity (optional)</label>
          <input id={`${mode}-capacity`} name="capacity" type="number" min={1} inputMode="numeric" defaultValue={initial?.capacity} className="input" placeholder="No limit" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${mode}-venue`}>Venue</label>
        <input id={`${mode}-venue`} name="venue" defaultValue={initial?.venue} className="input" placeholder="e.g. Eko Hotel, Lagos" />
      </div>
      {mode === "create" && (
      <fieldset>
        <legend className="label">Ticket prices, per person (₦)</legend>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((tier) => (
            <div key={tier}>
              <label className="mb-1 block text-xs text-muted" htmlFor={`${mode}-price_${tier}`}>{tier}</label>
              <input
                id={`${mode}-price_${tier}`}
                name={`price_${tier}`}
                inputMode="numeric"
                defaultValue=""
                className="input"
                placeholder="—"
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Leave empty to copy the prices from your latest event. You can change them any time.
        </p>
      </fieldset>
      )}
      {mode === "edit" && (
        <div>
          <label className="label" htmlFor={`${mode}-whatsapp_template`}>WhatsApp message</label>
          <textarea id={`${mode}-whatsapp_template`} name="whatsapp_template" rows={4} defaultValue={initial?.whatsapp_template} className="input text-sm" />
          <p className="mt-1 text-xs text-muted">
            Placeholders: <code>{"{name}"}</code> <code>{"{tier}"}</code> <code>{"{event}"}</code>{" "}
            <code>{"{slots}"}</code> <code>{"{link}"}</code>
          </p>
        </div>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{mode === "edit" ? "Save event" : "Create event"}</SubmitButton>
    </form>
  );
}
