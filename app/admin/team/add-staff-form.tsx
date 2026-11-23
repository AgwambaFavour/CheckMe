"use client";

import { useActionState } from "react";
import { addStaff } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/forms";
import { ROLES } from "@/lib/utils";

export function AddStaffForm() {
  const [state, action] = useActionState(addStaff, undefined);
  return (
    <form action={action} className="card space-y-4" key={state?.ok}>
      <div>
        <label className="label" htmlFor="f-name">Name</label>
        <input id="f-name" name="name" required className="input" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" required className="input" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="f-password">Temporary password (8+ characters)</label>
        <input id="f-password" name="password" type="text" minLength={8} required className="input font-mono" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="f-role">Role</label>
        <select id="f-role" name="role" defaultValue="admin" className="input">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}: {r.desc}
            </option>
          ))}
        </select>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Adding…">Add team member</SubmitButton>
    </form>
  );
}
