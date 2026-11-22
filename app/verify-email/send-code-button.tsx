"use client";

import { useState, useTransition } from "react";
import { sendVerificationCode, type FormState } from "@/app/actions/auth";
import { FormMessage } from "@/components/forms";

/** "Email me a code" button; reveals the code box (children) once a code has been sent. */
export function SendCodeButton({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FormState>(undefined);
  const [pending, start] = useTransition();
  const sent = Boolean(state?.ok);
  const send = () => start(async () => setState(await sendVerificationCode()));

  return (
    <div className="space-y-3">
      {!sent && (
        <button type="button" disabled={pending} className="btn-primary w-full" onClick={send}>
          {pending ? "Sending…" : "Email me a code"}
        </button>
      )}
      <FormMessage state={state} />
      {!sent && (
        <p className="text-center text-xs text-muted">The email may contain a code or a link. Either works.</p>
      )}
      {sent && (
        <>
          {children}
          <button type="button" disabled={pending} onClick={send} className="w-full text-center text-sm text-muted underline">
            {pending ? "Sending…" : "Send a new code"}
          </button>
        </>
      )}
    </div>
  );
}
