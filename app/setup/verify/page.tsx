import Link from "next/link";
import { verifySignupCode } from "@/app/actions/auth";
import { CodeForm } from "@/components/code-form";
import { ResendButton } from "./resend-button";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: PageProps<"/setup/verify">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  if (error || !email) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="card space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold">Couldn&apos;t confirm your email</h1>
          <p className="text-sm text-danger">{error || "Missing email address."}</p>
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary flex-1">Log in</Link>
            <Link href="/setup" className="btn-primary flex-1">Setup</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="card space-y-4">
        <div className="text-4xl">📧</div>
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a verification code to <span className="font-semibold text-ink">{email}</span>. Enter it below to
          confirm the address is yours.
        </p>
        <CodeForm action={verifySignupCode} email={email} />
        <ResendButton email={email} className="w-full text-center text-sm text-muted underline" />
      </div>
    </main>
  );
}
