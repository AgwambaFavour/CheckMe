import Link from "next/link";
import QRCode from "qrcode";
import { db } from "@/lib/supabase/server";
import { getCurrentEvent, requireOwner } from "@/lib/auth";
import type { PublicTicket } from "@/lib/public-ticket";
import { cleanPrices } from "@/lib/utils";
import { BrandingForm } from "../events/branding-form";

export default async function BrandingPage() {
  const me = await requireOwner();
  const event = await getCurrentEvent(me.org_id);
  if (!event) {
    return (
      <div className="card text-sm text-muted">
        Create an event first. <Link href="/admin/events" className="text-accent">Go to Events</Link>
      </div>
    );
  }
  const { data: org } = await db().from("organizations").select("name").eq("id", me.org_id).single();

  const sample: PublicTicket = {
    code: "SAMPLE2026",
    buyer_name: "Ada Obi",
    tier: "VIP",
    slots: 5,
    amount_paid: (cleanPrices(event.tier_prices).VIP ?? 20000) * 5,
    status: "active",
    event_name: event.name,
    starts_at: event.starts_at,
    venue: event.venue,
    org_name: org?.name ?? "",
    brand_color: event.brand_color,
    logo_url: event.logo_url,
    banner_url: event.banner_url,
  };
  const qrSvg = await QRCode.toString("SAMPLE-PREVIEW-ONLY", { type: "svg", margin: 1 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Branding</h1>
        <p className="text-sm text-muted">
          How tickets look for <span className="text-ink">{event.name}</span>. Changes apply to all of this
          event&apos;s tickets, including ones already sent. New events start with this event&apos;s branding.
        </p>
      </div>
      <BrandingForm key={event.id} sample={sample} qrSvg={qrSvg} eventId={event.id} />
    </div>
  );
}
