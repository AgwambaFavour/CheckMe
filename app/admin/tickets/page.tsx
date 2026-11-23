import Link from "next/link";
import { canManageTickets, getCurrentEvent, requireStaff, siteUrl } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { formatNaira, formatPhone, whatsappLink } from "@/lib/utils";
import { TierPill, WhatsAppIcon } from "@/components/ui";

type Row = {
  id: string;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  tier: string;
  slots: number;
  admitted: number;
  remaining: number;
  amount_paid: number;
  status: "active" | "void";
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Not arrived" },
  { key: "partial", label: "Partly in" },
  { key: "full", label: "All in" },
  { key: "void", label: "Voided" },
];

export default async function TicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";

  const me = await requireStaff();
  const event = await getCurrentEvent(me.org_id);
  if (!event) return <div className="card text-sm text-muted">No event yet.</div>;
  const canManage = canManageTickets(me);

  let query = db()
    .from("ticket_summary")
    .select("id, code, buyer_name, buyer_phone, tier, slots, admitted, remaining, amount_paid, status")
    .eq("org_id", me.org_id)
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (q) {
    const safe = q.replace(/[%,()*]/g, " ");
    const digits = q.replace(/\D/g, "");
    const ors = [`buyer_name.ilike.*${safe}*`, `code.ilike.*${safe}*`];
    if (digits.length >= 4) ors.push(`buyer_phone.ilike.*${digits.replace(/^0/, "")}*`);
    query = query.or(ors.join(","));
  }
  if (filter === "void") query = query.eq("status", "void");
  else {
    if (filter !== "all") query = query.eq("status", "active");
    if (filter === "waiting") query = query.eq("admitted", 0);
    if (filter === "partial") query = query.gt("admitted", 0).gt("remaining", 0);
    if (filter === "full") query = query.eq("remaining", 0);
  }

  const { data } = await query;
  const rows = (data ?? []) as Row[];
  const base = await siteUrl();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Tickets</h1>
        {canManage && <Link href="/admin/tickets/new" className="btn-primary px-3 py-2">+ New</Link>}
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="f" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, phone or code"
          className="input py-2.5"
          type="search"
        />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/tickets?f=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`pill shrink-0 border px-3 py-1.5 text-sm ${
              filter === f.key ? "border-accent bg-accent text-accent-ink" : "border-line text-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          {q || filter !== "all" ? "No tickets match." : canManage ? "No tickets yet. Create the first one." : "No tickets yet."}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className={`card flex items-center gap-3 p-3 sm:p-4 ${t.status === "void" ? "opacity-50" : ""}`}>
              <Link href={`/admin/tickets/${t.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{t.buyer_name}</span>
                  <TierPill tier={t.tier} />
                  {t.status === "void" && <span className="pill bg-danger/15 text-danger">Void</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {formatPhone(t.buyer_phone)} · {canManage && <>{formatNaira(t.amount_paid)} · </>}<span className="font-mono">{t.code}</span>
                </div>
              </Link>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">
                  {t.admitted}<span className="text-sm text-muted">/{t.slots}</span>
                </div>
                <div className="text-[11px] text-muted">in</div>
              </div>
              {canManage && t.status === "active" && (
                <a
                  href={whatsappLink(
                    event.whatsapp_template,
                    { name: t.buyer_name, tier: t.tier, event: event.name, slots: t.slots, link: `${base}/t/${t.code}` },
                    t.buyer_phone,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp h-10 w-10 shrink-0 p-0"
                  aria-label={`Send ${t.buyer_name}'s ticket on WhatsApp`}
                  title="Send on WhatsApp"
                >
                  <WhatsAppIcon />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 500 && <p className="text-center text-xs text-muted">Showing the latest 500. Use search to find others.</p>}
    </div>
  );
}
