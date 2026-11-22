/* eslint-disable @next/next/no-img-element */
import type { PublicTicket } from "@/lib/public-ticket";
import { formatDateTime, inkFor } from "@/lib/utils";

/** The ticket as guests see it. Used by the public ticket page and the owner's branding preview. */
export function TicketCard({ t, qrSvg }: { t: PublicTicket; qrSvg: string }) {
  const isVoid = t.status === "void";
  const ink = inkFor(t.brand_color);

  return (
    <article className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-[#0b0b0f] shadow-2xl print:border print:border-black print:shadow-none">
      {t.banner_url && (
        <img src={t.banner_url} alt="" className="block aspect-[4/3] w-full object-cover" />
      )}
      <div className="flex items-center gap-3 px-6 py-5" style={{ background: t.brand_color, color: ink }}>
        {t.logo_url && (
          <img src={t.logo_url} alt={`${t.org_name} logo`} className="h-12 w-12 shrink-0 rounded-lg bg-white/90 object-contain p-1" />
        )}
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{t.org_name}</div>
          <h1 className="text-2xl font-black leading-tight">{t.event_name}</h1>
          <div className="mt-0.5 text-sm font-medium opacity-80">
            {[formatDateTime(t.starts_at), t.venue].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      <div className="relative px-6 pb-6 pt-5">
        <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-bg print:hidden" />
        <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-bg print:hidden" />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ticket holder</div>
            <div className="truncate text-xl font-bold">{t.buyer_name}</div>
          </div>
          <div className="shrink-0 rounded-lg bg-[#0b0b0f] px-3 py-1.5 text-sm font-bold text-white">{t.tier}</div>
        </div>

        <div className="mt-3 rounded-xl bg-neutral-100 px-4 py-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Admits</div>
          <div className="text-3xl font-black">
            {t.slots} {t.slots === 1 ? "person" : "people"}
          </div>
        </div>

        <div className="relative mx-auto mt-5 w-full max-w-[260px]">
          <div className={isVoid ? "opacity-20" : ""} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          {isVoid && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded-lg border-4 border-red-600 px-4 py-1 text-3xl font-black text-red-600">VOID</span>
            </div>
          )}
        </div>
        <div className="mt-2 text-center font-mono text-sm tracking-[0.3em] text-neutral-500">{t.code}</div>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Show this QR code at the entrance. Don&apos;t share it — each slot can only be used once.
        </p>
      </div>
    </article>
  );
}
