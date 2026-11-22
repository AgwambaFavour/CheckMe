"use client";

import { useActionState } from "react";
import { setupOwner } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function SetupForm() {
  const [state, action] = useActionState(setupOwner, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="org">Organisation / brand name</label>
        <input id="org" name="org" required className="input" placeholder="e.g. Vibes Entertainment" />
      </div>
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" required className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password (8+ characters)</label>
        <input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending confirmation…">Send me a code</SubmitButton>
    </form>
  );
}
