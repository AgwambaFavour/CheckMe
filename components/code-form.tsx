"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

/** A single big input for the email verification code (works with phone auto-fill). */
export function CodeForm({
  action,
  email,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  email?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {email && <input type="hidden" name="email" value={email} />}
      <label className="label" htmlFor="code">Verification code</label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={12}
        required
        autoFocus
        placeholder="Enter code"
        className="input text-center font-mono text-3xl tracking-[0.35em] placeholder:tracking-normal placeholder:text-base"
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Checking…">Verify</SubmitButton>
      <p className="text-center text-xs text-muted">
        Got a link instead of a code? Just click it in this browser.
      </p>
    </form>
  );
}
