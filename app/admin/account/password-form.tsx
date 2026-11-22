"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="f-password">New password</label>
        <input id="f-password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="f-confirm">Confirm new password</label>
        <input id="f-confirm" name="confirm" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Update password</SubmitButton>
    </form>
  );
}
