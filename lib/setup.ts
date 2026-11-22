import "server-only";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/server";

/**
 * Turn a verified sign-up into the organisation + owner account.
 * Runs once the email is confirmed. Every setup gets its own organisation.
 */
export async function completeOwnerSetup(user: User): Promise<"created" | "exists" | "unverified" | "taken"> {
  if (!user.email_confirmed_at) return "unverified";

  const admin = db();
  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return "exists";

  const meta = (user.user_metadata ?? {}) as { org_name?: string; full_name?: string };
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: meta.org_name?.trim() || "My organisation" })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  const { error: profErr } = await admin.from("profiles").insert({
    id: user.id,
    org_id: org.id,
    full_name: meta.full_name?.trim() || user.email!,
    email: user.email!,
    role: "owner",
  });
  if (profErr) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw profErr;
  }
  return "created";
}
