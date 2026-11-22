"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { lookupTicket, type LookupResult } from "@/app/actions/admin";
import { Banner, CheckinPanel } from "@/components/checkin-panel";
import { extractCode } from "@/lib/utils";

type View =
  | { kind: "scanning" }
  | { kind: "loading"; code: string }
  | { kind: "result"; data: LookupResult; code: string }
  | { kind: "admitted"; name: string; count: number; remaining: number }
  | { kind: "error"; message: string };

const READER_ID = "qr-reader";

export function Scanner() {
  const [view, setView] = useState<View>({ kind: "scanning" });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const handleCode = useCallback(async (raw: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const code = extractCode(raw);
    try {
      scannerRef.current?.pause(true);
    } catch {}
    navigator.vibrate?.(60);
    setView({ kind: "loading", code });
    try {
      const data = await lookupTicket(code);
      if (!data.ok || data.wrongEvent || data.ticket.status === "void" || data.ticket.remaining <= 0) {
        navigator.vibrate?.([120, 80, 120]);
      }
      setView({ kind: "result", data, code });
    } catch {
      setView({ kind: "error", message: "Network problem. Check your internet and try again." });
    }
  }, []);

  // Start the camera once.
  useEffect(() => {
    let cancelled = false;
    let instance: Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      instance = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      try {
        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.7);
              return { width: size, height: size };
            },
          },
          (text) => void handleCode(text),
          () => {},
        );
        if (cancelled) {
          await instance.stop().catch(() => {});
          return;
        }
        scannerRef.current = instance;
      } catch (err) {
        if (!cancelled)
          setCameraError(
            String(err).includes("NotAllowed")
              ? "Camera permission was denied. Allow camera access for this site in your browser settings, then reload."
              : "Couldn't start the camera. Use the code box below, or reload the page.",
          );
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current ?? instance;
      scannerRef.current = null;
      if (s?.isScanning) s.stop().catch(() => {});
    };
  }, [handleCode]);

  const scanNext = () => {
    busyRef.current = false;
    setManual("");
    setView({ kind: "scanning" });
    try {
      scannerRef.current?.resume();
    } catch {}
  };

  const showOverlay = view.kind !== "scanning";

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <div id={READER_ID} className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
            {cameraError}
          </div>
        )}
      </div>

      {!showOverlay && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) void handleCode(manual);
          }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type ticket code"
            className="input py-2.5 font-mono uppercase"
            autoCapitalize="characters"
          />
          <button className="btn-secondary">Check</button>
        </form>
      )}
      {!showOverlay && (
        <p className="text-center text-xs text-muted">
          Guest&apos;s phone dead?{" "}
          <Link href="/admin/tickets" className="text-accent">Search by name or phone</Link>
        </p>
      )}

      {showOverlay && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-bg/95 backdrop-blur">
          <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
            <ResultView view={view} onAdmitted={(name, count, remaining) => {
              navigator.vibrate?.(200);
              setView({ kind: "admitted", name, count, remaining });
            }} />
            <button onClick={scanNext} className="btn-primary mt-4 w-full py-4 text-base">
              ⌖ Scan next ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultView({
  view,
  onAdmitted,
}: {
  view: View;
  onAdmitted: (name: string, count: number, remaining: number) => void;
}) {
  if (view.kind === "loading")
    return <div className="py-20 text-center text-muted">Checking {view.code}…</div>;

  if (view.kind === "error") return <Banner tone="danger">{view.message}</Banner>;

  if (view.kind === "admitted")
    return (
      <div className="rounded-3xl bg-ok p-8 text-center text-white">
        <div className="text-6xl">✓</div>
        <div className="mt-2 text-3xl font-black">ADMIT {view.count}</div>
        <div className="mt-1 text-lg font-semibold">{view.name}</div>
        <div className="mt-3 text-sm opacity-90">
          {view.remaining === 0 ? "Ticket is now fully used." : `${view.remaining} slot(s) still remaining on this ticket.`}
        </div>
      </div>
    );

  if (view.kind !== "result") return null;
  const { data } = view;

  if (!data.ok)
    return (
      <div className="rounded-3xl bg-danger p-8 text-center text-white">
        <div className="text-6xl">✕</div>
        <div className="mt-2 text-3xl font-black">INVALID TICKET</div>
        <div className="mt-2 text-sm opacity-90">
          No ticket found for code <span className="font-mono">{view.code || "(empty)"}</span>. Do not admit.
        </div>
      </div>
    );

  const { ticket } = data;
  const bad = ticket.status === "void" || ticket.remaining <= 0;

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl p-5 ${data.wrongEvent || bad ? "bg-danger text-white" : "bg-surface border border-line"}`}>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{ticket.tier} ticket</div>
        <div className="text-2xl font-black">{ticket.buyer_name}</div>
        <div className="mt-1 text-sm opacity-80">
          {ticket.slots === 1 ? "Single" : `${ticket.slots}-man`} · <span className="font-mono">{ticket.code}</span>
        </div>
      </div>

      {data.wrongEvent ? (
        <Banner tone="danger">
          WRONG EVENT — this ticket is for &ldquo;{ticket.event_name}&rdquo;. Do not admit.
        </Banner>
      ) : (
        <CheckinPanel data={data} onAdmitted={({ count, remaining }) => onAdmitted(ticket.buyer_name, count, remaining)} />
      )}

      <Link href={`/admin/tickets/${ticket.id}`} className="block text-center text-sm text-muted underline">
        Open full ticket details
      </Link>
    </div>
  );
}
