import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { signOut, verifyOwnerCode } from "@/app/actions/auth";
import { CodeForm } from "@/components/code-form";
import { SendCodeButton } from "./send-code-button";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const me = await getProfile();
  if (!me) redirect("/login");
  if (me.emailVerified || me.role !== "owner") redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="card space-y-4">
        <div className="text-4xl">🔐</div>
        <h1 className="text-xl font-bold">Verify your email</h1>
        <p className="text-sm text-muted">
          Before you can manage events, confirm that{" "}
          <span className="font-semibold text-ink">{me.email}</span> is really yours. We&apos;ll email you a
          verification code.
        </p>
        <SendCodeButton>
          <CodeForm action={verifyOwnerCode} />
        </SendCodeButton>
        <form action={signOut}>
          <button className="w-full text-center text-sm text-muted underline">Log out</button>
        </form>
      </div>
    </main>
  );
}
