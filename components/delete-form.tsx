"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

/** A destructive action that only unlocks once the user types the exact name. */
export function DeleteForm({
  action,
  id,
  name,
  button,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id?: string;
  name: string;
  button: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [typed, setTyped] = useState("");
  const inputId = `confirm-${id ?? "org"}`;
  return (
    <form action={formAction} className="card space-y-3 border-danger/40">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="text-sm text-muted">{children}</div>
      <div>
        <label className="label" htmlFor={inputId}>
          Type <b className="text-ink">{name}</b> to confirm
        </label>
        <input
          id={inputId}
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="input"
        />
      </div>
      <FormMessage state={state} />
      {typed.trim() === name.trim() ? (
        <SubmitButton pendingText="Deleting…" className="btn-danger w-full">
          {button}
        </SubmitButton>
      ) : (
        <button type="button" disabled className="btn-danger w-full opacity-50">
          {button}
        </button>
      )}
    </form>
  );
}
