import Link from "next/link";
import { getCurrentEvent, requireStaff } from "@/lib/auth";
import { getStats } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";
import { LiveStats } from "./live-stats";

export default async function Dashboard() {
  const me = await requireStaff();
  const event = await getCurrentEvent(me.org_id);

  if (!event) {
    return (
      <div className="card mx-auto mt-10 max-w-md space-y-3 text-center">
        <h1 className="text-xl font-bold">Welcome 👋</h1>
        {me.role === "owner" ? (
          <>
            <p className="text-sm text-muted">Create your first event to start generating tickets.</p>
            <Link href="/admin/events" className="btn-primary w-full">Create an event</Link>
          </>
        ) : (
          <p className="text-sm text-muted">The owner hasn&apos;t created an event yet.</p>
        )}
      </div>
    );
  }

  const stats = await getStats();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted">
          {[formatDateTime(event.starts_at), event.venue].filter(Boolean).join(" · ") || "No date set"}
        </p>
      </div>
      <LiveStats key={event.id} initial={stats} capacity={event.capacity} eventId={event.id} />
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/scan" className="btn-primary py-4 text-base">⌖ Scan tickets</Link>
        <Link href="/admin/tickets/new" className="btn-secondary py-4 text-base">+ New ticket</Link>
      </div>
    </div>
  );
}
