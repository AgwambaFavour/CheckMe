import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { createAuthClient, db } from "@/lib/supabase/server";
import type { Role } from "@/lib/utils";

export type { Role };

export type Profile = {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: Role;
  /** True once this person has clicked a link emailed to them (proves they own the address). */
  emailVerified: boolean;
};

export type EventRow = {
  id: string;
  org_id: string;
  name: string;
  starts_at: string | null;
  venue: string | null;
  capacity: number | null;
  whatsapp_template: string;
  brand_color: string;
  logo_url: string | null;
  banner_url: string | null;
  tier_prices: Record<string, number> | null;
  created_at: string;
};

export const EVENT_COOKIE = "checkme_event";

/** The logged-in staff member's profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db()
    .from("profiles")
    .select("id, org_id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as Omit<Profile, "emailVerified">), emailVerified: user.app_metadata?.email_verified === true };
});

/** Owners must have proven they own their email address before using the admin area. */
export async function requireStaff() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "owner" && !profile.emailVerified) redirect("/verify-email");
  return profile;
}

/** Record that this user proved ownership of their email (they arrived via an emailed link). */
export async function markEmailVerified(user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.email_verified === true) return;
  await db().auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), email_verified: true },
  });
}

export async function requireOwner() {
  const profile = await requireStaff();
  if (profile.role !== "owner") redirect("/admin");
  return profile;
}

/** Owners and admins create, edit and void tickets. Scanners only check guests in. */
export function canManageTickets(profile: Pick<Profile, "role">) {
  return profile.role === "owner" || profile.role === "admin";
}

export async function requireTicketManager() {
  const profile = await requireStaff();
  if (!canManageTickets(profile)) redirect("/admin/scan");
  return profile;
}

export const listEvents = cache(async (orgId: string): Promise<EventRow[]> => {
  const { data } = await db()
    .from("events")
    .select("*")
    .eq("org_id", orgId)
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data as EventRow[]) ?? [];
});

/** The event currently selected in this browser (cookie), else the most recent. */
export const getCurrentEvent = cache(async (orgId: string): Promise<EventRow | null> => {
  const events = await listEvents(orgId);
  if (events.length === 0) return null;
  const selected = (await cookies()).get(EVENT_COOKIE)?.value;
  return events.find((e) => e.id === selected) ?? events[0];
});

/** Absolute base URL of this site, e.g. https://checkme.vercel.app */
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function newTicketCode(length = 10) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}
