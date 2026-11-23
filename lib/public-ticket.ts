import "server-only";
import { cache } from "react";
import { db } from "@/lib/supabase/server";
import { DEFAULT_BRAND } from "@/lib/utils";

export type PublicTicket = {
  code: string;
  buyer_name: string;
  tier: string;
  slots: number;
  /** Total paid for the ticket, in whole naira. Shown on the ticket; 0 hides it. */
  amount_paid: number;
  status: "active" | "void";
  event_name: string;
  starts_at: string | null;
  venue: string | null;
  org_name: string;
  brand_color: string;
  logo_url: string | null;
  banner_url: string | null;
};

/** Only the fields that are safe to show to anyone holding the link (no phone number). */
export const getPublicTicket = cache(async (rawCode: string): Promise<PublicTicket | null> => {
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return null;
  const { data } = await db()
    .from("tickets")
    .select("code, buyer_name, tier, slots, amount_paid, status, events(name, starts_at, venue, brand_color, logo_url, banner_url), organizations(name)")
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  const ev = data.events as unknown as {
    name: string;
    starts_at: string | null;
    venue: string | null;
    brand_color: string;
    logo_url: string | null;
    banner_url: string | null;
  };
  const org = data.organizations as unknown as { name: string };
  return {
    code: data.code,
    buyer_name: data.buyer_name,
    tier: data.tier,
    slots: data.slots,
    amount_paid: Number(data.amount_paid) || 0,
    status: data.status,
    event_name: ev?.name ?? "",
    starts_at: ev?.starts_at ?? null,
    venue: ev?.venue ?? null,
    org_name: org?.name ?? "",
    brand_color: ev?.brand_color ?? DEFAULT_BRAND,
    logo_url: ev?.logo_url ?? null,
    banner_url: ev?.banner_url ?? null,
  };
});
