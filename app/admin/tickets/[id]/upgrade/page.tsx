import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTicketManager } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { cleanPrices, formatNaira } from "@/lib/utils";
import { TierPill } from "@/components/ui";
import { UpgradeForm } from "./upgrade-form";

export default async function UpgradeTicketPage({ params }: PageProps<"/admin/tickets/[id]/upgrade">) {
  const { id } = await params;
  const me = await requireTicketManager();
  const { data: t } = await db()
    .from("ticket_summary")
    .select("id, event_id, buyer_name, tier, slots, admitted, amount_paid, status")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) notFound();
  if (t.status === "void") redirect(`/admin/tickets/${t.id}`);
  const { data: event } = await db().from("events").select("tier_prices").eq("id", t.event_id).single();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/admin/tickets/${t.id}`} className="text-sm text-muted">← Back to ticket</Link>
      <div>
        <h1 className="text-xl font-bold">Upgrade ticket</h1>
        <p className="text-sm text-muted">Add more people or move to a better ticket type. The QR code and link stay the same.</p>
      </div>
      <div className="card flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{t.buyer_name}</div>
          <div className="text-xs text-muted">
            {t.slots} {t.slots === 1 ? "person" : "people"} · {formatNaira(t.amount_paid)} paid · {t.admitted} already in
          </div>
        </div>
        <TierPill tier={t.tier} />
      </div>
      <UpgradeForm
        ticket={{ id: t.id, tier: t.tier, slots: t.slots, amount_paid: Number(t.amount_paid) }}
        prices={cleanPrices(event?.tier_prices)}
      />
    </div>
  );
}
