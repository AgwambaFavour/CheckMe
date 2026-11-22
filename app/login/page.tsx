import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { isSetupDone } from "@/app/actions/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getProfile()) redirect("/admin");
  const setupDone = await isSetupDone();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl font-black text-accent-ink">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Staff login</h1>
        <p className="mt-1 text-sm text-muted">For event organisers only.</p>
      </div>
      {setupDone ? (
        <LoginForm />
      ) : (
        <div className="card space-y-3">
          <p className="text-sm text-muted">No organisation has been set up yet.</p>
          <Link href="/setup" className="btn-primary w-full">
            Set up your organisation
          </Link>
        </div>
      )}
    </main>
  );
}
