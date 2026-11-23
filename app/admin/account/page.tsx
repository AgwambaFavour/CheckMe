import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/utils";
import { deleteOrganization } from "@/app/actions/admin";
import { DeleteForm } from "@/components/delete-form";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const me = await requireStaff();
  const org =
    me.role === "owner"
      ? (await db().from("organizations").select("name").eq("id", me.org_id).maybeSingle()).data
      : null;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">My account</h1>
      <div className="card text-sm">
        <div className="font-medium">{me.full_name}</div>
        <div className="text-muted">{me.email} · {roleLabel(me.role)}</div>
      </div>
      <h2 className="font-semibold">Change password</h2>
      <PasswordForm />

      {org && (
        <section className="space-y-3 pt-4">
          <h2 className="font-semibold text-danger">Delete organisation</h2>
          <DeleteForm action={deleteOrganization} name={org.name} button="Delete organisation">
            This permanently deletes <b className="text-ink">{org.name}</b>: every event, ticket and check-in,
            all uploaded images, and the logins of everyone on your team, including yours. Guests&apos; ticket
            links stop working. This can&apos;t be undone.
          </DeleteForm>
        </section>
      )}
    </div>
  );
}
