import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export default async function Home({ searchParams }: PageProps<"/">) {
  // If Supabase falls back to the Site URL, the confirmation code lands here: pass it on.
  const sp = await searchParams;
  if (typeof sp.code === "string") redirect(`/auth/confirm?code=${encodeURIComponent(sp.code)}`);
  if (typeof sp.error_description === "string")
    redirect(`/setup/verify?error=${encodeURIComponent(sp.error_description)}`);

  const profile = await getProfile();
  redirect(profile ? "/admin" : "/login");
}
