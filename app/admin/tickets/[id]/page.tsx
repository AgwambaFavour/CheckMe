import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { canManageTickets, getCurrentEvent, requireStaff, siteUrl } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { lookupTicket, setTicketStatus, undoCheckin } from "@/app/actions/admin";
import { formatNaira, formatPhone, formatTime, whatsappLink } from "@/lib/utils";
import { TierPill, WhatsAppIcon } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { CopyButton, TicketCheckin } from "./client";

export default async function TicketDetail({ params, searchParams }: PageProps<"/admin/tickets/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = sp.new === "1";
  const isUpgraded = sp.upgraded === "1";
  const me = await requireStaff();
  const canManage = canManageTickets(me);

  const { data: t } = await db()
    .from("ticket_summary")
    .select("*")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: event }, { data: history }, lookup, current, { data: upgrades }] = await Promise.all([
    db().from("events").select("id, name, whatsapp_template").eq("id", t.event_id).single(),
    db()
      .from("checkins")
      .select("id, count, names, admitted_by_name, created_at, undone_at, undone_by_name")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: false }),
    lookupTicket(t.code),
    getCurrentEvent(me.org_id),
    canManage
      ? db()
          .from("ticket_upgrades")
          .select("id, added_slots, from_tier, to_tier, extra_amount, by_name, created_at")
          .eq("ticket_id", t.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const link = `${await siteUrl()}/t/${t.code}`;
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const waHref = whatsappLink(
    event?.whatsapp_template ?? "{link}",
    { name: t.buyer_name, tier: t.tier, event: event?.name ?? "", slots: t.slots, link },
    t.buyer_phone,
  );
  const isVoid = t.status === "void";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/admin/tickets" className="text-sm text-muted">← All tickets</Link>

      {isNew && (
        <div className="rounded-2xl border border-ok/50 bg-ok/10 p-4">
          <div className="font-semibold text-ok">✓ Ticket generated</div>
          <div className="text-sm text-muted">Now send it to {t.buyer_name} on WhatsApp.</div>
        </div>
      )}

      {isUpgraded && (
        <div className="rounded-2xl border border-ok/50 bg-ok/10 p-4">
          <div className="font-semibold text-ok">✓ Ticket upgraded</div>
          <div className="text-sm text-muted">
            Same QR code and link, now for {t.slots} {t.slots === 1 ? "person" : "people"}. Send {t.buyer_name} the updated ticket.
          </div>
        </div>
      )}

      {event && current && event.id !== current.id && (
        <div className="rounded-xl border border-warn/50 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
          This ticket is for <b>{event.name}</b>, not the event currently selected.
        </div>
      )}

      <div className={`card ${isVoid ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{t.buyer_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <TierPill tier={t.tier} />
              <span>{t.slots === 1 ? "Single" : `${t.slots}-man`}</span>
              {isVoid && <span className="pill bg-danger/15 text-danger">VOID</span>}
            </div>
          </div>
          <div
            className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white p-1"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Item label="WhatsApp" value={formatPhone(t.buyer_phone)} />
          {canManage && <Item label="Amount paid" value={formatNaira(t.amount_paid)} />}
          <Item label="Code" value={<span className="font-mono">{t.code}</span>} />
          <Item label="Created" value={`${formatTime(t.created_at)}${t.created_by_name ? ` · ${t.created_by_name}` : ""}`} />
        </dl>
        {t.guest_names.length > 0 && (
          <div className="mt-3 text-sm">
            <span className="text-muted">Guests: </span>
            {t.guest_names.join(", ")}
          </div>
        )}
      </div>

      {canManage && !isVoid && (
        <div className="space-y-2">
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full py-4 text-base">
            <WhatsAppIcon /> Send on WhatsApp
          </a>
          <div className="grid grid-cols-3 gap-2">
            <CopyButton text={link} />
            <a href={`/t/${t.code}`} target="_blank" className="btn-secondary">View</a>
            <a href={`/t/${t.code}/image`} download={`ticket-${t.code}.png`} className="btn-secondary">Image</a>
          </div>
        </div>
      )}

      {lookup.ok && !isVoid && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Check in</h2>
          <TicketCheckin data={lookup} />
        </div>
      )}

      {upgrades && upgrades.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Upgrades</h2>
          <ul className="divide-y divide-line text-sm">
            {upgrades.map((u) => (
              <li key={u.id} className="py-2.5">
                <div>
                  {[
                    u.added_slots > 0 && `+${u.added_slots} ${u.added_slots === 1 ? "person" : "people"}`,
                    u.from_tier !== u.to_tier && `${u.from_tier} → ${u.to_tier}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  <span className="text-muted">for</span> <b>{formatNaira(u.extra_amount)}</b>
                </div>
                <div className="text-xs text-muted">
                  {formatTime(u.created_at)} · {u.by_name ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-semibold">Check-in history</h2>
          <ul className="divide-y divide-line text-sm">
            {history.map((c) => (
              <li key={c.id} className={`flex items-center justify-between gap-3 py-2.5 ${c.undone_at ? "opacity-50" : ""}`}>
                <div>
                  <div className={c.undone_at ? "line-through" : ""}>
                    <b>{c.count}</b> admitted{c.names.length > 0 && ` — ${c.names.join(", ")}`}
                  </div>
                  <div className="text-xs text-muted">
                    {formatTime(c.created_at)} · {c.admitted_by_name ?? "—"}
                    {c.undone_at && ` · undone by ${c.undone_by_name ?? "—"}`}
                  </div>
                </div>
                {!c.undone_at && (
                  <form action={undoCheckin}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={`Undo this check-in of ${c.count}? They'll be counted as not arrived.`} className="btn-secondary px-3 py-1.5 text-xs">
                      Undo
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
      <div className="flex gap-2">
        {!isVoid && (
          <Link href={`/admin/tickets/${t.id}/upgrade`} className="btn-primary flex-1">Upgrade</Link>
        )}
        <Link href={`/admin/tickets/${t.id}/edit`} className="btn-secondary flex-1">Edit</Link>
        <form action={setTicketStatus} className="flex-1">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="status" value={isVoid ? "active" : "void"} />
          {isVoid ? (
            <button className="btn-secondary w-full">Restore ticket</button>
          ) : (
            <ConfirmButton message="Void this ticket? It will be rejected at the gate." className="btn-danger w-full">
              Void ticket
            </ConfirmButton>
          )}
        </form>
      </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
