"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LookupResult } from "@/app/actions/admin";
import { Banner, CheckinPanel } from "@/components/checkin-panel";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt("Copy this link:", text);
        }
      }}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}

export function TicketCheckin({ data }: { data: Extract<LookupResult, { ok: true }> }) {
  const router = useRouter();
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {done && <Banner tone="ok">{done}</Banner>}
      <CheckinPanel
        // remount with fresh numbers after the server refresh
        key={`${data.ticket.admitted}-${data.checkins.length}`}
        data={data}
        onAdmitted={({ count, remaining }) => {
          setDone(`✓ Admitted ${count}. ${remaining} remaining.`);
          router.refresh();
        }}
      />
    </div>
  );
}
