export const TIERS = ["Regular", "VIP", "Table"] as const;

export type Role = "owner" | "admin" | "scanner";

export const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "owner", label: "Owner", desc: "Everything, plus events, prices, branding & team" },
  { value: "admin", label: "Admin", desc: "Create, edit & void tickets, and scan" },
  { value: "scanner", label: "Scanner", desc: "Scan tickets & check guests in only" },
];

export function parseRole(value: unknown): Role {
  return value === "owner" || value === "scanner" ? value : "admin";
}

export function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

/** Read the per-person price list for an event, keeping only valid tiers and amounts. */
export function cleanPrices(raw: unknown): Partial<Record<(typeof TIERS)[number], number>> {
  const out: Partial<Record<(typeof TIERS)[number], number>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const tier of TIERS) {
    const v = (raw as Record<string, unknown>)[tier];
    if (typeof v === "number" && Number.isInteger(v) && v > 0) out[tier] = v;
  }
  return out;
}

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number) {
  return naira.format(amount);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Normalise a phone number to international digits for wa.me (Nigeria default). */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = "234" + digits.slice(1);
  if (digits.length === 10 && /^[789]/.test(digits)) digits = "234" + digits;
  return digits;
}

/** Pretty-print a normalised number, e.g. 2348031234567 -> +234 803 123 4567 */
export function formatPhone(digits: string) {
  const m = digits.match(/^234(\d{3})(\d{3})(\d{4})$/);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : digits ? `+${digits}` : "";
}

export function slotsLabel(slots: number) {
  return slots === 1 ? "1 person" : `${slots} people`;
}

/** Turn a scanned QR value (full ticket URL or bare code) into a ticket code. */
export function extractCode(raw: string) {
  const value = raw.trim();
  const match = value.match(/\/t\/([A-Za-z0-9]+)/);
  if (match) return match[1].toUpperCase();
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function whatsappLink(
  template: string,
  vars: { name: string; tier: string; event: string; slots: number; link: string },
  phone: string,
) {
  const text = template
    .replaceAll("{name}", vars.name)
    .replaceAll("{tier}", vars.tier)
    .replaceAll("{event}", vars.event)
    .replaceAll("{slots}", slotsLabel(vars.slots))
    .replaceAll("{link}", vars.link);
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

/** Parse a textarea of names (one per line or comma separated). */
export function parseNames(raw: string | null | undefined) {
  return (raw ?? "")
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

export const DEFAULT_BRAND = "#c8ff3d";

/** Black or white, whichever reads better on top of the given colour. */
export function inkFor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#0b0b0f";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? "#0b0b0f" : "#ffffff";
}
