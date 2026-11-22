"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" defaultValue={state?.unconfirmedEmail} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <FormMessage state={state} />
      {state?.unconfirmedEmail && (
        <a href={`/setup/verify?email=${encodeURIComponent(state.unconfirmedEmail)}`} className="btn-secondary w-full">
          Enter my verification code
        </a>
      )}
      <SubmitButton pendingText="Signing in…">Log in</SubmitButton>
    </form>
  );
}
