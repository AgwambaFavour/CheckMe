import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createAuthClient, db } from "@/lib/supabase/server";
import { completeOwnerSetup } from "@/lib/setup";
import { markEmailVerified } from "@/lib/auth";

/**
 * Landing point for the "confirm your email" link.
 * Supports both the default PKCE link (?code=) and token-hash links (?token_hash=&type=).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/setup/verify?error=${encodeURIComponent(reason)}`, url.origin));

  // Supabase may redirect with an error instead of a code (e.g. expired link).
  const linkError = url.searchParams.get("error_description");
  if (linkError) return fail(linkError);

  const supabase = await createAuthClient();
  let error: { message: string } | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    return fail("This confirmation link is incomplete.");
  }

  if (error) {
    return fail(
      /code verifier|flow_state|both auth code and code verifier/i.test(error.message)
        ? "Open the confirmation link in the same browser you registered in."
        : error.message,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Could not confirm your email. Please try again.");

  // They reached this point by clicking a link sent to their inbox: the email is theirs.
  await markEmailVerified(user);

  const result = await completeOwnerSetup(user);
  if (result === "taken") {
    await supabase.auth.signOut();
    await db().auth.admin.deleteUser(user.id); // don't leave an orphan login behind
    return fail("This system has already been set up by someone else.");
  }
  if (result === "unverified") return fail("Your email is not confirmed yet.");

  return NextResponse.redirect(new URL(result === "created" ? "/admin/events?welcome=1" : "/admin", url.origin));
}
