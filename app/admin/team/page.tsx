import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import { removeStaff, setStaffRole } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/forms";
import { AddStaffForm } from "./add-staff-form";

export default async function TeamPage() {
  const me = await requireOwner();
  const { data: staff } = await db()
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("org_id", me.org_id)
    .order("created_at");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section>
        <h1 className="text-xl font-bold">Team</h1>
        <p className="mb-3 text-sm text-muted">
          <b>Owners</b> manage events and the team. <b>Admins</b> create tickets and scan at the gate.
        </p>
        <ul className="space-y-2">
          {(staff ?? []).map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {s.full_name} {s.id === me.id && <span className="text-xs text-muted">(you)</span>}
                </div>
                <div className="truncate text-xs text-muted">{s.email}</div>
              </div>
              <span className={`pill ${s.role === "owner" ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted"}`}>
                {s.role}
              </span>
              {s.id !== me.id && (
                <div className="flex gap-2">
                  <form action={setStaffRole}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="role" value={s.role === "owner" ? "admin" : "owner"} />
                    <ConfirmButton
                      message={s.role === "owner" ? `Make ${s.full_name} a regular admin?` : `Make ${s.full_name} an owner? They'll be able to manage events and the team.`}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      {s.role === "owner" ? "Make admin" : "Make owner"}
                    </ConfirmButton>
                  </form>
                  <form action={removeStaff}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton message={`Remove ${s.full_name}? They will no longer be able to log in.`} className="btn-danger px-3 py-1.5 text-xs">
                      Remove
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Add a team member</h2>
        <p className="mb-3 text-sm text-muted">
          Set a temporary password and share it with them privately. They can change it under More → My account.
        </p>
        <AddStaffForm />
      </section>
    </div>
  );
}
