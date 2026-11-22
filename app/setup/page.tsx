import { redirect } from "next/navigation";
import { isSetupDone } from "@/app/actions/auth";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await isSetupDone()) redirect("/login");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Set up CheckMe</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        One-time setup. We&apos;ll email you a verification code to confirm the address is yours. Your
        organisation and owner account are created once you enter it.
      </p>
      <SetupForm />
    </main>
  );
}
