import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getProfile()) redirect("/admin");
  const { deleted } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl font-black text-accent-ink">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Staff login</h1>
        <p className="mt-1 text-sm text-muted">For event organisers only.</p>
      </div>
      {deleted && (
        <p className="mb-4 rounded-xl border border-ok/40 bg-ok/10 px-3.5 py-2.5 text-sm text-ok">
          Your organisation and all its data have been deleted.
        </p>
      )}
      <LoginForm />
      <div className="mt-4 space-y-2 text-center">
        <p className="text-sm text-muted">New here? Create your own organisation.</p>
        <Link href="/setup" className="btn-secondary w-full">
          Set up your organisation
        </Link>
      </div>
    </main>
  );
}
