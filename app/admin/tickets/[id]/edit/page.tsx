import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { TicketForm } from "../../ticket-form";

export default async function EditTicketPage({ params }: PageProps<"/admin/tickets/[id]/edit">) {
  const { id } = await params;
  const me = await requireStaff();
  const { data: t } = await db()
    .from("ticket_summary")
    .select("id, buyer_name, buyer_phone, tier, slots, amount_paid, guest_names, admitted")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-xl font-bold">Edit ticket</h1>
      <TicketForm initial={t} minSlots={Math.max(1, t.admitted)} />
    </div>
  );
}
