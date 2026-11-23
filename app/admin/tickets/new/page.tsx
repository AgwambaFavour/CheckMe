import Link from "next/link";
import { getCurrentEvent, requireTicketManager } from "@/lib/auth";
import { cleanPrices } from "@/lib/utils";
import { TicketForm } from "../ticket-form";

export default async function NewTicketPage() {
  const me = await requireTicketManager();
  const event = await getCurrentEvent(me.org_id);
  if (!event) {
    return (
      <div className="card text-center text-sm text-muted">
        No event yet.{" "}
        {me.role === "owner" && <Link href="/admin/events" className="text-accent">Create one first.</Link>}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">New ticket</h1>
      <p className="mb-5 text-sm text-muted">
        For <span className="text-ink">{event.name}</span>. Only create it after the bank transfer is confirmed.
      </p>
      <TicketForm
        prices={cleanPrices(event.tier_prices)}
        pricesHref={me.role === "owner" ? "/admin/events#prices" : undefined}
      />
    </div>
  );
}
