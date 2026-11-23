import { notFound } from "next/navigation";
import { requireTicketManager } from "@/lib/auth";
import { cleanPrices } from "@/lib/utils";
import { db } from "@/lib/supabase/server";
import { TicketForm } from "../../ticket-form";

export default async function EditTicketPage({ params }: PageProps<"/admin/tickets/[id]/edit">) {
  const { id } = await params;
  const me = await requireTicketManager();
  const { data: t } = await db()
    .from("ticket_summary")
    .select("id, event_id, buyer_name, buyer_phone, tier, slots, amount_paid, guest_names, admitted")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) notFound();
  const { data: event } = await db().from("events").select("tier_prices").eq("id", t.event_id).single();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-xl font-bold">Edit ticket</h1>
      <TicketForm initial={t} minSlots={Math.max(1, t.admitted)} prices={cleanPrices(event?.tier_prices)} />
    </div>
  );
}
