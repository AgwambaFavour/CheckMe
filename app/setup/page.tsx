import Link from "next/link";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Set up your organisation</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        We&apos;ll email you a verification code to confirm the address is yours. Your organisation and
        owner account are created once you enter it.
      </p>
      <SetupForm />
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline">Log in</Link>
      </p>
    </main>
  );
}
