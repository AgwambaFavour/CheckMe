"use client";

import { useState, useTransition } from "react";
import { resendConfirmation, type FormState } from "@/app/actions/auth";
import { FormMessage } from "@/components/forms";

export function ResendButton({ email, className = "btn-secondary w-full" }: { email: string; className?: string }) {
  const [state, setState] = useState<FormState>(undefined);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => start(async () => setState(await resendConfirmation(email)))}
      >
        {pending ? "Sending…" : "Send a new code"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
