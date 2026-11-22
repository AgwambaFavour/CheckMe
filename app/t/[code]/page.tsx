import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/auth";
import { getPublicTicket } from "@/lib/public-ticket";
import { TicketCard } from "@/components/ticket-card";
import { PrintButton } from "./print-button";

export async function generateMetadata({ params }: PageProps<"/t/[code]">): Promise<Metadata> {
  const { code } = await params;
  const t = await getPublicTicket(code);
  if (!t) return { title: "Ticket not found", robots: { index: false } };
  const title = `${t.event_name} — ${t.tier} ticket`;
  const description = `${t.buyer_name} · ${t.slots === 1 ? "Admits 1" : `Admits ${t.slots}`}`;
  const image = `${await siteUrl()}/t/${t.code}/image`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 1440 }] },
  };
}

export default async function PublicTicketPage({ params }: PageProps<"/t/[code]">) {
  const { code } = await params;
  const t = await getPublicTicket(code);
  if (!t) notFound();

  const link = `${await siteUrl()}/t/${t.code}`;
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 print:bg-white print:py-0">
      <TicketCard t={t} qrSvg={qrSvg} />
      {t.status !== "void" && (
        <div className="no-print mt-5 flex w-full max-w-sm gap-2">
          <a href={`/t/${t.code}/image`} download={`ticket-${t.code}.png`} className="btn-primary flex-1">
            Download ticket
          </a>
          <PrintButton />
        </div>
      )}
    </main>
  );
}
