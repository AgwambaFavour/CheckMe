"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient, db } from "@/lib/supabase/server";
import {
  EVENT_COOKIE,
  getCurrentEvent,
  newTicketCode,
  canManageTickets,
  requireOwner,
  requireStaff,
  requireTicketManager,
} from "@/lib/auth";
import { normalizePhone, parseNames, parseRole, TIERS } from "@/lib/utils";
import type { FormState } from "./auth";

// ───────────────────────── Events (owner) ─────────────────────────

function readEventForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const startsRaw = String(formData.get("starts_at") ?? "").trim();
  // datetime-local has no timezone: treat it as Lagos time (UTC+1, no DST).
  const starts_at = startsRaw ? new Date(`${startsRaw}:00+01:00`).toISOString() : null;
  const capRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capRaw ? Math.max(1, parseInt(capRaw, 10) || 0) || null : null;
  const whatsapp_template = String(formData.get("whatsapp_template") ?? "").trim();
  const tier_prices: Record<string, number> = {};
  for (const tier of TIERS) {
    const n = parseInt(String(formData.get(`price_${tier}`) ?? "").replace(/[^\d]/g, ""), 10);
    if (Number.isInteger(n) && n > 0) tier_prices[tier] = n;
  }
  return { name, venue, starts_at, capacity, whatsapp_template, tier_prices };
}

export async function createEvent(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  const fields = readEventForm(formData);
  if (!fields.name) return { error: "Give the event a name." };
  const { whatsapp_template, tier_prices, ...rest } = fields;
  // New events start with the branding, message and prices of the most recent event.
  const { data: prev } = await db()
    .from("events")
    .select("brand_color, logo_url, banner_url, whatsapp_template, tier_prices")
    .eq("org_id", me.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await db()
    .from("events")
    .insert({
      ...(prev ?? {}),
      ...rest,
      ...(whatsapp_template ? { whatsapp_template } : {}),
      ...(Object.keys(tier_prices).length > 0 ? { tier_prices } : {}),
      org_id: me.org_id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  (await cookies()).set(EVENT_COOKIE, data.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function updateEvent(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const fields = readEventForm(formData);
  if (!fields.name) return { error: "Give the event a name." };
  if (!fields.whatsapp_template) return { error: "WhatsApp message can't be empty." };
  if (!fields.whatsapp_template.includes("{link}"))
    return { error: "WhatsApp message must include {link} so the guest gets their ticket." };
  // Prices have their own form (setTicketPrices).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tier_prices, ...details } = fields;
  const { error } = await db().from("events").update(details).eq("id", id).eq("org_id", me.org_id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

/** Price per person for Regular / VIP / Table on one event. Empty means "no price". */
export async function setTicketPrices(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const { tier_prices } = readEventForm(formData);
  const { error } = await db().from("events").update({ tier_prices }).eq("id", id).eq("org_id", me.org_id);
  if (error) {
    if (error.message.includes("tier_prices"))
      return { error: "Your database needs a one-time update before prices can be saved (see the note above)." };
    return { error: error.message };
  }
  revalidatePath("/admin", "layout");
  const set = TIERS.filter((t) => tier_prices[t]).length;
  return { ok: set ? "Prices saved. New tickets will work out the amount automatically." : "Prices cleared." };
}

/** Permanently delete one event (by id) with all its tickets, check-ins and uploaded images. Owners only. */
export async function deleteEvent(formData: FormData) {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const { data: ev } = await db().from("events").select("id").eq("id", id).eq("org_id", me.org_id).maybeSingle();
  if (!ev) return;

  const { error } = await db().from("events").delete().eq("id", ev.id).eq("org_id", me.org_id);
  if (error) return;
  await removeBrandFiles([`${me.org_id}/${ev.id}`]);

  const jar = await cookies();
  if (jar.get(EVENT_COOKIE)?.value === ev.id) jar.delete(EVENT_COOKIE);
  revalidatePath("/admin", "layout");
}

/**
 * Permanently delete the whole organisation: every event, ticket and check-in,
 * every team member's login, and all uploaded images. The owner must type the
 * organisation's name to confirm.
 */
export async function deleteOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const admin = db();
  const { data: org } = await admin.from("organizations").select("id, name").eq("id", me.org_id).maybeSingle();
  if (!org) return { error: "Organisation not found." };
  if (confirm !== org.name.trim()) return { error: `Type "${org.name}" exactly to confirm.` };

  const [{ data: members }, { data: events }] = await Promise.all([
    admin.from("profiles").select("id").eq("org_id", org.id),
    admin.from("events").select("id").eq("org_id", org.id),
  ]);

  // Cascades to profiles, events, tickets, check-ins and upgrades.
  const { error } = await admin.from("organizations").delete().eq("id", org.id);
  if (error) return { error: error.message };

  await removeBrandFiles((events ?? []).map((e) => `${org.id}/${e.id}`));
  // Remove the logins too. Otherwise logging in again would quietly set up a fresh organisation.
  // Delete everyone else first and the current user last.
  const others = (members ?? []).map((m) => m.id).filter((id) => id !== me.id);
  await Promise.all(others.map((id) => admin.auth.admin.deleteUser(id)));
  await (await createAuthClient()).auth.signOut();
  await admin.auth.admin.deleteUser(me.id);

  (await cookies()).delete(EVENT_COOKIE);
  redirect("/login?deleted=1");
}

// ───────────────────────── Branding (owner) ─────────────────────────

const BRAND_BUCKET = "brand";

/** Best effort: delete every uploaded file inside these storage folders. */
async function removeBrandFiles(folders: string[]) {
  const bucket = db().storage.from(BRAND_BUCKET);
  await Promise.all(
    folders.map(async (folder) => {
      const { data } = await bucket.list(folder, { limit: 1000 });
      const paths = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
      if (paths.length) await bucket.remove(paths);
    }),
  );
}
const BRAND_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };
type BrandKind = "logo" | "banner";

async function ownedEvent(orgId: string, eventId: string) {
  const { data } = await db().from("events").select("id").eq("id", eventId).eq("org_id", orgId).maybeSingle();
  return data;
}

/** Step 1 of an upload: a one-time signed URL so the browser can upload straight to storage. */
export async function getBrandUploadUrl(eventId: string, kind: BrandKind, contentType: string) {
  const me = await requireOwner();
  if (!(await ownedEvent(me.org_id, eventId))) return { error: "Event not found." };
  const ext = BRAND_TYPES[contentType];
  if (!ext) return { error: "Please upload a PNG or JPG image." };
  const path = `${me.org_id}/${eventId}/${kind}-${Date.now()}.${ext}`;
  const { data, error } = await db().storage.from(BRAND_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
  return { path: data.path, token: data.token };
}

/** Step 2: point the event at the uploaded file (or clear it with path = null). */
export async function setEventImage(eventId: string, kind: BrandKind, path: string | null) {
  const me = await requireOwner();
  if (!(await ownedEvent(me.org_id, eventId))) return { error: "Event not found." };
  if (path && !path.startsWith(`${me.org_id}/${eventId}/`)) return { error: "Invalid file." };
  const url = path ? db().storage.from(BRAND_BUCKET).getPublicUrl(path).data.publicUrl : null;
  const column = kind === "logo" ? "logo_url" : "banner_url";
  const { error } = await db().from("events").update({ [column]: url }).eq("id", eventId).eq("org_id", me.org_id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function setBrandColor(eventId: string, color: string) {
  const me = await requireOwner();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Pick a valid colour." };
  const { error } = await db()
    .from("events")
    .update({ brand_color: color.toLowerCase() })
    .eq("id", eventId)
    .eq("org_id", me.org_id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function selectEvent(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("event_id") ?? "");
  (await cookies()).set(EVENT_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/admin", "layout");
}

// ───────────────────────── Tickets ─────────────────────────

function readTicketForm(formData: FormData) {
  const buyer_name = String(formData.get("buyer_name") ?? "").trim();
  const buyer_phone = normalizePhone(String(formData.get("buyer_phone") ?? ""));
  const tierRaw = String(formData.get("tier") ?? "");
  const tier = (TIERS as readonly string[]).includes(tierRaw) ? tierRaw : "Regular";
  const slots = parseInt(String(formData.get("slots") ?? ""), 10);
  const amount = parseInt(String(formData.get("amount_paid") ?? "").replace(/[^\d]/g, ""), 10);
  const guest_names = parseNames(String(formData.get("guest_names") ?? ""));
  return { buyer_name, buyer_phone, tier, slots, amount_paid: amount, guest_names };
}

function validateTicket(t: ReturnType<typeof readTicketForm>): string | null {
  if (!t.buyer_name) return "Enter the buyer's name.";
  if (t.buyer_phone.length < 10 || t.buyer_phone.length > 15) return "Enter a valid WhatsApp number.";
  if (!Number.isInteger(t.slots) || t.slots < 1) return "Slots must be at least 1.";
  if (t.slots > 10000) return "That's a lot of slots — check the number.";
  if (!Number.isInteger(t.amount_paid) || t.amount_paid < 0) return "Enter the amount paid (₦).";
  if (t.guest_names.length > t.slots) return `You listed ${t.guest_names.length} names but only ${t.slots} slots.`;
  return null;
}

export async function createTicket(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireTicketManager();
  const event = await getCurrentEvent(me.org_id);
  if (!event) return { error: "Create an event first." };
  const fields = readTicketForm(formData);
  const invalid = validateTicket(fields);
  if (invalid) return { error: invalid };

  let ticketId: string | null = null;
  for (let attempt = 0; attempt < 5 && !ticketId; attempt++) {
    const { data, error } = await db()
      .from("tickets")
      .insert({
        ...fields,
        org_id: me.org_id,
        event_id: event.id,
        code: newTicketCode(),
        created_by: me.id,
        created_by_name: me.full_name,
      })
      .select("id")
      .single();
    if (data) ticketId = data.id;
    else if (error && error.code !== "23505") return { error: error.message }; // 23505 = code collision, retry
  }
  if (!ticketId) return { error: "Could not generate a ticket code. Try again." };

  revalidatePath("/admin", "layout");
  redirect(`/admin/tickets/${ticketId}?new=1`);
}

export async function updateTicket(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireTicketManager();
  const id = String(formData.get("id") ?? "");
  const fields = readTicketForm(formData);
  const invalid = validateTicket(fields);
  if (invalid) return { error: invalid };

  const { data: current } = await db()
    .from("ticket_summary")
    .select("admitted")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!current) return { error: "Ticket not found." };
  if (fields.slots < current.admitted)
    return { error: `${current.admitted} people are already admitted — slots can't go below that.` };

  const { error } = await db()
    .from("tickets")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", me.org_id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  redirect(`/admin/tickets/${id}`);
}

export async function setTicketStatus(formData: FormData) {
  const me = await requireTicketManager();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "void" ? "void" : "active";
  await db()
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", me.org_id);
  revalidatePath("/admin", "layout");
}

/** Permanently delete a ticket and its check-in history. Owners and admins. */
export async function deleteTicket(formData: FormData) {
  const me = await requireTicketManager();
  const id = String(formData.get("id") ?? "");
  const { error } = await db().from("tickets").delete().eq("id", id).eq("org_id", me.org_id);
  if (error) return;
  revalidatePath("/admin", "layout");
  redirect("/admin/tickets");
}

/** People who bought tickets before (any event), matched by name or number, newest first. */
export async function searchBuyers(q: string): Promise<{ name: string; phone: string }[]> {
  const me = await requireTicketManager();
  const query = q.trim();
  if (query.length < 2) return [];
  const safe = query.replace(/[%,()*]/g, " ");
  const digits = query.replace(/\D/g, "");
  const ors = [`buyer_name.ilike.*${safe}*`];
  if (digits.length >= 4) ors.push(`buyer_phone.ilike.*${digits.replace(/^0/, "")}*`);
  const { data } = await db()
    .from("tickets")
    .select("buyer_name, buyer_phone")
    .eq("org_id", me.org_id)
    .or(ors.join(","))
    .order("created_at", { ascending: false })
    .limit(40);
  const seen = new Set<string>();
  const out: { name: string; phone: string }[] = [];
  for (const r of data ?? []) {
    if (seen.has(r.buyer_phone)) continue;
    seen.add(r.buyer_phone);
    out.push({ name: r.buyer_name, phone: r.buyer_phone });
    if (out.length >= 6) break;
  }
  return out;
}

/** Add people to a ticket and/or move it to a better type, adding what they paid on top. */
export async function upgradeTicket(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireTicketManager();
  const id = String(formData.get("id") ?? "");
  const added = parseInt(String(formData.get("added_slots") ?? "0"), 10) || 0;
  const tierRaw = String(formData.get("tier") ?? "");
  const extra = parseInt(String(formData.get("extra_amount") ?? "").replace(/[^\d]/g, ""), 10);

  const { data: t } = await db()
    .from("tickets")
    .select("id, slots, tier, amount_paid, status")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) return { error: "Ticket not found." };
  if (t.status === "void") return { error: "This ticket is voided. Restore it before upgrading." };

  const tier = (TIERS as readonly string[]).includes(tierRaw) ? tierRaw : t.tier;
  if (added < 0) return { error: "You can only add people here. Use Edit to correct a mistake." };
  if (added === 0 && tier === t.tier) return { error: "Add at least one person or pick a different ticket type." };
  if (t.slots + added > 10000) return { error: "That's a lot of slots — check the number." };
  if (!Number.isInteger(extra) || extra < 0) return { error: "Enter the extra amount paid (₦). Use 0 if it's free." };

  // Only apply if nobody changed the ticket since we read it (two admins upgrading at once).
  const { data: updated, error } = await db()
    .from("tickets")
    .update({
      slots: t.slots + added,
      tier,
      amount_paid: Number(t.amount_paid) + extra,
      updated_at: new Date().toISOString(),
    })
    .eq("id", t.id)
    .eq("org_id", me.org_id)
    .eq("slots", t.slots)
    .eq("tier", t.tier)
    .eq("amount_paid", t.amount_paid)
    .select("id");
  if (error) return { error: error.message };
  if (!updated?.length) return { error: "Someone else just changed this ticket. Reload and try again." };

  await db().from("ticket_upgrades").insert({
    ticket_id: t.id,
    org_id: me.org_id,
    added_slots: added,
    from_tier: t.tier,
    to_tier: tier,
    extra_amount: extra,
    by_id: me.id,
    by_name: me.full_name,
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/tickets/${t.id}?upgraded=1`);
}

// ───────────────────────── Check-in ─────────────────────────

export type LookupResult =
  | { ok: false; reason: "not_found" }
  | {
      ok: true;
      ticket: {
        id: string;
        code: string;
        buyer_name: string;
        buyer_phone: string;
        tier: string;
        slots: number;
        admitted: number;
        remaining: number;
        status: "active" | "void";
        guest_names: string[];
        event_id: string;
        event_name: string;
      };
      wrongEvent: boolean;
      checkins: {
        id: string;
        count: number;
        names: string[];
        admitted_by_name: string | null;
        created_at: string;
      }[];
    };

export async function lookupTicket(code: string): Promise<LookupResult> {
  const me = await requireStaff();
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, reason: "not_found" };
  const { data: t } = await db()
    .from("ticket_summary")
    .select("id, code, buyer_name, buyer_phone, tier, slots, admitted, remaining, status, guest_names, event_id")
    .eq("code", clean)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!t) return { ok: false, reason: "not_found" };

  const [{ data: ev }, { data: checkins }, current] = await Promise.all([
    db().from("events").select("name").eq("id", t.event_id).single(),
    db()
      .from("checkins")
      .select("id, count, names, admitted_by_name, created_at")
      .eq("ticket_id", t.id)
      .is("undone_at", null)
      .order("created_at", { ascending: true }),
    getCurrentEvent(me.org_id),
  ]);

  return {
    ok: true,
    ticket: { ...t, event_name: ev?.name ?? "" },
    wrongEvent: current?.id !== t.event_id,
    checkins: checkins ?? [],
  };
}

export type AdmitResult = { ok: true; admitted: number; remaining: number } | { ok: false; error: string };

export async function admitGuests(ticketId: string, count: number, names: string[]): Promise<AdmitResult> {
  const me = await requireStaff();
  const { data: owned } = await db()
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!owned) return { ok: false, error: "Ticket not found." };

  const cleanNames = names.map((n) => n.trim()).filter(Boolean).slice(0, count);
  const { data, error } = await db().rpc("admit_guests", {
    p_ticket_id: ticketId,
    p_count: count,
    p_names: cleanNames,
    p_admin_id: me.id,
    p_admin_name: me.full_name,
  });
  if (error) {
    const msg = error.message;
    if (msg.includes("TICKET_VOID")) return { ok: false, error: "This ticket has been voided." };
    if (msg.includes("NOT_ENOUGH_SLOTS")) {
      const left = msg.split(":")[1]?.trim();
      return { ok: false, error: `Only ${left ?? "a few"} slot(s) left on this ticket.` };
    }
    if (msg.includes("INVALID_COUNT")) return { ok: false, error: "Choose how many people to admit." };
    return { ok: false, error: msg };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, ...(data as { admitted: number; remaining: number }) };
}

export async function undoCheckin(formData: FormData) {
  const me = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const { data: row } = await db()
    .from("checkins")
    .select("id, tickets!inner(org_id)")
    .eq("id", id)
    .eq("tickets.org_id", me.org_id)
    .maybeSingle();
  if (!row) return;
  await db()
    .from("checkins")
    .update({ undone_at: new Date().toISOString(), undone_by_name: me.full_name })
    .eq("id", id)
    .is("undone_at", null);
  revalidatePath("/admin", "layout");
}

export async function getStats() {
  const me = await requireStaff();
  const event = await getCurrentEvent(me.org_id);
  if (!event) return null;
  const { data } = await db().rpc("event_stats", { p_event_id: event.id });
  // Scanners don't see money.
  if (data && !canManageTickets(me)) data.revenue = null;
  return data as {
    tickets: number;
    slots: number;
    revenue: number | null;
    admitted: number;
    voided: number;
    by_tier: { tier: string; tickets: number; slots: number; admitted: number }[];
  } | null;
}

// ───────────────────────── Team (owner) ─────────────────────────

export async function addStaff(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireOwner();
  const full_name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  if (!full_name || !email) return { error: "Enter a name and email." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const admin = db();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return {
      error: error?.message?.toLowerCase().includes("already")
        ? "Someone with that email already has an account."
        : error?.message ?? "Could not create account.",
    };
  }
  const { error: profErr } = await admin
    .from("profiles")
    .insert({ id: data.user.id, org_id: me.org_id, full_name, email, role });
  if (profErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: profErr.message };
  }
  revalidatePath("/admin/team");
  return { ok: `${full_name} can now log in with ${email} and the password you set.` };
}

export async function removeStaff(formData: FormData) {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (id === me.id) return; // can't remove yourself
  const { data: target } = await db()
    .from("profiles")
    .select("id")
    .eq("id", id)
    .eq("org_id", me.org_id)
    .maybeSingle();
  if (!target) return;
  await db().auth.admin.deleteUser(id); // cascades to profile
  revalidatePath("/admin/team");
}

export async function setStaffRole(formData: FormData) {
  const me = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const role = parseRole(formData.get("role"));
  if (id === me.id) return; // don't demote yourself by accident
  await db().from("profiles").update({ role }).eq("id", id).eq("org_id", me.org_id);
  revalidatePath("/admin/team");
}
