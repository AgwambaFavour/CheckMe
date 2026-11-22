"use server";

import { redirect } from "next/navigation";
import { createAuthClient, db } from "@/lib/supabase/server";
import { getProfile, markEmailVerified, siteUrl } from "@/lib/auth";
import { completeOwnerSetup } from "@/lib/setup";

export type FormState = { error?: string; ok?: string; unconfirmedEmail?: string } | undefined;

function emailErrorMessage(code: string | undefined, message: string) {
  switch (code) {
    case "email_address_not_authorized":
      return "Supabase's built-in email service only sends to members of your Supabase team. Use the email you log in to Supabase with, or set up custom SMTP (see README).";
    case "over_email_send_rate_limit":
      return "Too many emails sent recently. Wait a few minutes and try again.";
    case "email_address_invalid":
      return "That email address doesn't look valid.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
    default:
      return message;
  }
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed")
    return { error: "You haven't confirmed your email yet. Enter the code we emailed you.", unconfirmedEmail: email };
  if (error) return { error: "Wrong email or password." };

  // Confirmed account without a profile: finish first-run setup, otherwise it has no access.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await db().from("profiles").select("id").eq("id", user!.id).maybeSingle();
  if (!profile) {
    const result = await completeOwnerSetup(user!);
    if (result !== "created") {
      await supabase.auth.signOut();
      return { error: "This account doesn't have access. Ask the owner to add you to the team." };
    }
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Set up a new organisation. Anyone can do this; each organisation only sees its own data.
 * Creates an UNCONFIRMED account and emails a confirmation code. The organisation + owner
 * profile are only created once it's confirmed, proving the email belongs to the person.
 */
export async function setupOwner(_: FormState, formData: FormData): Promise<FormState> {
  const orgName = String(formData.get("org") ?? "").trim();
  const fullName = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!orgName || !fullName || !email) return { error: "Fill in every field." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
      data: { org_name: orgName, full_name: fullName },
    },
  });
  if (error) return { error: emailErrorMessage(error.code, error.message) };

  // Supabase signals "email already registered" by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0)
    return { error: "An account with this email already exists. Log in instead." };

  // If Supabase returned a session straight away, email confirmation is switched OFF
  // in the project — refuse, because the email would never be verified.
  if (data.session) {
    await supabase.auth.signOut();
    if (data.user) await db().auth.admin.deleteUser(data.user.id);
    return {
      error:
        "Email confirmation is turned off in Supabase. Turn on Authentication → Sign In / Providers → Email → \"Confirm email\", then try again.",
    };
  }

  redirect(`/setup/verify?email=${encodeURIComponent(email)}`);
}

export async function resendConfirmation(email: string): Promise<FormState> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: "Missing email address." };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: clean,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm` },
  });
  if (error) return { error: emailErrorMessage(error.code, error.message) };
  return { ok: "New code sent! Check your inbox (and spam folder)." };
}

function cleanCode(raw: FormDataEntryValue | null) {
  return String(raw ?? "").replace(/\D/g, "");
}

function codeErrorMessage(code: string | undefined, message: string) {
  if (code === "otp_expired" || /expired|invalid/i.test(message))
    return "That code is wrong or has expired. Check the latest email, or request a new code.";
  if (code === "over_request_rate_limit") return "Too many attempts. Wait a minute and try again.";
  return message;
}

/** Setup step 2: the verification code from the confirmation email. */
export async function verifySignupCode(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = cleanCode(formData.get("code"));
  if (!email) return { error: "Missing email address. Start setup again." };
  if (token.length < 6) return { error: "Enter the verification code from the email." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { error: codeErrorMessage(error?.code, error?.message ?? "") };

  await markEmailVerified(data.user);
  const result = await completeOwnerSetup(data.user);
  if (result === "taken") {
    await supabase.auth.signOut();
    await db().auth.admin.deleteUser(data.user.id);
    return { error: "This system has already been set up by someone else." };
  }
  redirect(result === "created" ? "/admin/events?welcome=1" : "/admin");
}

/** Existing owners: email a verification code to the logged-in user's address. */
export async function sendVerificationCode(): Promise<FormState> {
  const me = await getProfile();
  if (!me) return { error: "Please log in again." };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: me.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await siteUrl()}/auth/confirm` },
  });
  if (error) return { error: emailErrorMessage(error.code, error.message) };
  return { ok: `Code sent to ${me.email}.` };
}

/** Existing owners: check the code; only the real inbox owner can know it. */
export async function verifyOwnerCode(_: FormState, formData: FormData): Promise<FormState> {
  const me = await getProfile();
  if (!me) return { error: "Please log in again." };
  const token = cleanCode(formData.get("code"));
  if (token.length < 6) return { error: "Enter the verification code from the email." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: me.email, token, type: "email" });
  if (error || !data.user) return { error: codeErrorMessage(error?.code, error?.message ?? "") };
  if (data.user.id !== me.id) return { error: "That code belongs to a different account." };

  await markEmailVerified(data.user);
  redirect("/admin");
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Password updated." };
}
