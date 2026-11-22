import { getCurrentEvent, requireStaff } from "@/lib/auth";
import { Scanner } from "./scanner";

export default async function ScanPage() {
  const me = await requireStaff();
  const event = await getCurrentEvent(me.org_id);
  if (!event) return <div className="card text-sm text-muted">No event selected.</div>;
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3">
        <h1 className="text-xl font-bold">Scan tickets</h1>
        <p className="text-sm text-muted">
          Checking in for <span className="text-ink">{event.name}</span>
        </p>
      </div>
      <Scanner />
    </div>
  );
}
