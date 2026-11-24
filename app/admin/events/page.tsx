import { getCurrentEvent, listEvents, requireOwner } from "@/lib/auth";
import { cleanPrices, formatDateTime } from "@/lib/utils";
import { EventForm } from "./event-form";
import { PricesForm } from "./prices-form";
import { ConfirmButton } from "@/components/forms";
import { db } from "@/lib/supabase/server";
import { deleteEvent } from "@/app/actions/admin";

function toLagosInput(iso: string | null) {
  if (!iso) return "";
  // shift to UTC+1 and format as yyyy-MM-ddTHH:mm for <input type="datetime-local">
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default async function EventsPage() {
  const me = await requireOwner();
  const [events, current] = await Promise.all([listEvents(me.org_id), getCurrentEvent(me.org_id)]);
  // Ticket count per event, so duplicate events can be told apart before deleting one.
  const counts = await Promise.all(
    events.map(async (e) => {
      const { count } = await db().from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id);
      return count ?? 0;
    }),
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {current && (
        <section id="prices" className="scroll-mt-28">
          <h1 className="text-xl font-bold">Ticket prices</h1>
          <p className="mb-3 text-sm text-muted">For {current.name}.</p>
          {current.tier_prices === undefined && (
            <div className="mb-3 rounded-xl border border-warn/50 bg-warn/10 px-3.5 py-3 text-sm text-warn">
              <b>One-time database update needed.</b> In Supabase, open SQL Editor → New query, paste the contents of{" "}
              <code>supabase/003_scanner_and_prices.sql</code> and <code>supabase/004_ticket_upgrades.sql</code>, and
              click Run. Then reload this page.
            </div>
          )}
          <PricesForm key={current.id} eventId={current.id} prices={cleanPrices(current.tier_prices)} />
        </section>
      )}

      {current && (
        <section>
          <h2 className="text-xl font-bold">Event details</h2>
          <p className="mb-3 text-sm text-muted">Edit details and the WhatsApp message for {current.name}.</p>
          <EventForm
            key={current.id}
            mode="edit"
            initial={{
              id: current.id,
              name: current.name,
              venue: current.venue ?? "",
              starts_at: toLagosInput(current.starts_at),
              capacity: current.capacity ? String(current.capacity) : "",
              whatsapp_template: current.whatsapp_template,
            }}
          />
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold">{current ? "Create another event" : "Create your first event"}</h2>
        <p className="mb-3 text-sm text-muted">New events become the selected event. Switch events at the top of the screen.</p>
        <EventForm mode="create" />
      </section>

      {events.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">All events</h2>
          <p className="mb-2 text-sm text-muted">
            Deleting an event also deletes all its tickets and check-ins. This can&apos;t be undone.
          </p>
          <ul className="space-y-2">
            {events.map((e, i) => {
              const label = `${e.name}${e.starts_at ? ` (${formatDateTime(e.starts_at)})` : ""}`;
              const tickets = `${counts[i]} ticket${counts[i] === 1 ? "" : "s"}`;
              return (
                <li key={e.id} className="card flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.name}</div>
                    <div className="text-xs text-muted">
                      {formatDateTime(e.starts_at) || "No date"} · {tickets} · created {formatDateTime(e.created_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {e.id === current?.id && <span className="pill bg-accent text-accent-ink">Selected</span>}
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton
                        message={`Delete "${label}" and its ${tickets}? This can't be undone.`}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
