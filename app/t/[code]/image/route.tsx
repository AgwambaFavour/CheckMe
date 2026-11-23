import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/auth";
import { getPublicTicket } from "@/lib/public-ticket";
import { formatDateTime, formatNaira, inkFor } from "@/lib/utils";
import { ticketFonts } from "@/lib/og-fonts";

/** Fetch a brand image and inline it, so a broken/missing file never breaks the ticket. */
async function inline(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpeg)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: RouteContext<"/t/[code]/image">) {
  const { code } = await ctx.params;
  const t = await getPublicTicket(code);
  if (!t) return new Response("Not found", { status: 404 });

  const link = `${await siteUrl()}/t/${t.code}`;
  const [qr, logo, banner, fonts] = await Promise.all([
    QRCode.toDataURL(link, { margin: 1, width: 640, errorCorrectionLevel: "M" }),
    inline(t.logo_url),
    inline(t.banner_url),
    ticketFonts(),
  ]);
  const when = [formatDateTime(t.starts_at), t.venue].filter(Boolean).join(" · ");
  const isVoid = t.status === "void";
  const ink = inkFor(t.brand_color);
  const qrSize = banner ? 440 : 520;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0f", padding: 48, fontFamily: fonts.length ? "Inter" : undefined }}>
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: 48, overflow: "hidden" }}>
          {banner && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={banner} width={984} height={420} style={{ width: 984, height: 420, objectFit: "cover" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", background: t.brand_color, padding: "36px 52px", color: ink }}>
            {logo && (
              <div style={{ display: "flex", width: 110, height: 110, background: "rgba(255,255,255,0.9)", borderRadius: 20, padding: 10, marginRight: 28 }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                <img src={logo} width={90} height={90} style={{ width: 90, height: 90, objectFit: "contain" }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 24, letterSpacing: 6, textTransform: "uppercase", opacity: 0.7 }}>{t.org_name}</div>
              <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>{t.event_name}</div>
              {when && <div style={{ fontSize: 28, marginTop: 8, opacity: 0.8 }}>{when}</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 52px", flex: 1 }}>
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 22, color: "#737373", textTransform: "uppercase", letterSpacing: 3 }}>Ticket holder</div>
                <div style={{ fontSize: 46, fontWeight: 700, color: "#0b0b0f" }}>{t.buyer_name}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", background: "#0b0b0f", color: "#fff", fontSize: 30, fontWeight: 700, padding: "8px 22px", borderRadius: 14 }}>{t.tier}</div>
                <div style={{ fontSize: 30, color: "#0b0b0f", marginTop: 10 }}>{`Admits ${t.slots}`}</div>
                {t.amount_paid > 0 && (
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#525252", marginTop: 4 }}>{`${formatNaira(t.amount_paid)} paid`}</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", position: "relative", marginTop: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img src={qr} width={qrSize} height={qrSize} style={{ opacity: isVoid ? 0.2 : 1 }} />
              {isVoid && (
                <div style={{ position: "absolute", top: qrSize / 2 - 60, left: qrSize / 2 - 160, display: "flex", fontSize: 96, fontWeight: 800, color: "#dc2626", border: "8px solid #dc2626", borderRadius: 16, padding: "0 32px", transform: "rotate(-12deg)" }}>
                  VOID
                </div>
              )}
            </div>
            <div style={{ fontSize: 32, letterSpacing: 12, color: "#737373", marginTop: 12 }}>{t.code}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1440,
      fonts: fonts.length ? fonts : undefined,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
