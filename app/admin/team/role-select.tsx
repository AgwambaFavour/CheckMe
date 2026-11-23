"use client";

import { useRef } from "react";
import { ROLES } from "@/lib/utils";

const CONFIRM: Record<string, string> = {
  owner: "They'll be able to manage events, prices, branding and the team.",
  admin: "They'll be able to create, edit and void tickets, and scan.",
  scanner: "They'll only be able to scan tickets and check guests in.",
};

/** Change a team member's role; asks before saving. */
export function RoleSelect({
  id,
  name,
  role,
  action,
}: {
  id: string;
  name: string;
  role: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`role-${id}`}>Role for {name}</label>
      <select
        id={`role-${id}`}
        name="role"
        defaultValue={role}
        key={role}
        onChange={(e) => {
          const next = ROLES.find((r) => r.value === e.target.value);
          if (next && window.confirm(`Make ${name} ${next.value === "owner" ? "an" : "a"} ${next.label.toLowerCase()}? ${CONFIRM[next.value]}`)) {
            formRef.current?.requestSubmit();
          } else {
            e.target.value = role;
          }
        }}
        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-accent"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </form>
  );
}
