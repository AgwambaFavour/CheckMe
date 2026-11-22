"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getBrandUploadUrl, setBrandColor, setEventImage } from "@/app/actions/admin";
import { TicketCard } from "@/components/ticket-card";
import type { PublicTicket } from "@/lib/public-ticket";

const PRESETS = ["#c8ff3d", "#ffd400", "#ff6b00", "#e11d48", "#a855f7", "#2563eb", "#10b981", "#0b0b0f"];
const MAX_BYTES = 5 * 1024 * 1024;

const storage = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  }).storage.from("brand");

export function BrandingForm({ sample, qrSvg, eventId }: { sample: PublicTicket; qrSvg: string; eventId: string }) {
  const router = useRouter();
  const [color, setColor] = useState(sample.brand_color);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const upload = async (kind: "logo" | "banner", file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage({ tone: "error", text: "Please use a PNG or JPG image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ tone: "error", text: "That image is over 5 MB. Please use a smaller one." });
      return;
    }
    setBusy(kind);
    try {
      const signed = await getBrandUploadUrl(eventId, kind, file.type);
      if ("error" in signed) throw new Error(signed.error);
      const { error } = await storage().uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const saved = await setEventImage(eventId, kind, signed.path);
      if ("error" in saved) throw new Error(saved.error);
      setMessage({ tone: "ok", text: kind === "logo" ? "Logo updated." : "Flyer updated." });
      startTransition(() => router.refresh());
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (kind: "logo" | "banner") => {
    setBusy(kind);
    await setEventImage(eventId, kind, null);
    setBusy(null);
    startTransition(() => router.refresh());
  };

  const saveColor = async (value: string) => {
    setColor(value);
    setBusy("color");
    const res = await setBrandColor(eventId, value);
    setBusy(null);
    if ("error" in res) setMessage({ tone: "error", text: res.error ?? "Could not save colour." });
    else startTransition(() => router.refresh());
  };

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_auto]">
      <div className="card space-y-5">
        <ImagePicker
          label="Logo"
          hint="Square works best. PNG with a transparent background is ideal."
          current={sample.logo_url}
          busy={busy === "logo"}
          onPick={(f) => upload("logo", f)}
          onRemove={() => remove("logo")}
        />
        <ImagePicker
          label="Flyer / banner"
          hint="Shown across the top of the ticket. Landscape images look best."
          current={sample.banner_url}
          busy={busy === "banner"}
          onPick={(f) => upload("banner", f)}
          onRemove={() => remove("banner")}
        />

        <div>
          <div className="label">Brand colour</div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => saveColor(c)}
                className={`h-9 w-9 rounded-full border-2 ${color === c ? "border-ink" : "border-line"}`}
                style={{ background: c }}
                aria-label={`Use colour ${c}`}
              />
            ))}
            <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2 py-1.5 text-sm">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={(e) => e.target.value !== sample.brand_color && saveColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Custom colour"
              />
              <span className="font-mono">{color}</span>
            </label>
            {busy === "color" && <span className="text-xs text-muted">Saving…</span>}
          </div>
        </div>

        {message && (
          <p className={`rounded-xl border px-3.5 py-2.5 text-sm ${message.tone === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center">
        <div className="mb-2 self-start text-sm font-medium text-muted">Preview</div>
        <div className="w-full max-w-sm rounded-3xl bg-bg">
          <TicketCard t={{ ...sample, brand_color: color }} qrSvg={qrSvg} />
        </div>
      </div>
    </div>
  );
}

function ImagePicker({
  label,
  hint,
  current,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  current: string | null;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-secondary px-3 py-2">
            {busy ? "Uploading…" : current ? "Replace" : "Upload"}
          </button>
          {current && !busy && (
            <button type="button" onClick={onRemove} className="btn px-3 py-2 text-muted hover:text-danger">
              Remove
            </button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
