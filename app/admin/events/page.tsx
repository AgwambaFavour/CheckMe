import { getCurrentEvent, listEvents, requireOwner } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { EventForm } from "./event-form";

function toLagosInput(iso: string | null) {
  if (!iso) return "";
  // shift to UTC+1 and format as yyyy-MM-ddTHH:mm for <input type="datetime-local">
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default async function EventsPage() {
  const me = await requireOwner();
  const [events, current] = await Promise.all([listEvents(me.org_id), getCurrentEvent(me.org_id)]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {current && (
        <section>
          <h1 className="text-xl font-bold">Current event</h1>
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

      {events.length > 1 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">All events</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted">{formatDateTime(e.starts_at) || "No date"}</div>
                </div>
                {e.id === current?.id && <span className="pill bg-accent text-accent-ink">Selected</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
