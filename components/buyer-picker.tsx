"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchBuyers } from "@/app/actions/admin";
import {
  clearSavedContacts,
  parseVcf,
  pickContacts,
  saveContacts,
  useContactPicker,
  useSavedContacts,
} from "@/lib/contacts";
import { formatPhone, normalizePhone } from "@/lib/utils";

type Match = { name: string; phone: string; source: "contacts" | "buyers" };

/**
 * Buyer name + WhatsApp number. Typing a name searches the contacts imported on this
 * device and past buyers; tapping a result fills both fields.
 */
export function BuyerPicker({
  name,
  phone,
  onName,
  onPhone,
}: {
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
}) {
  const canPick = useContactPicker();
  const saved = useSavedContacts();
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState<{ q: string; list: Match[] }>({ q: "", list: [] });
  const [otherPhones, setOtherPhones] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const query = name.trim().toLowerCase();
  const queryDigits = name.replace(/\D/g, "");

  // Past buyers from the server, a moment after typing stops.
  useEffect(() => {
    if (!open || query.length < 2) return;
    const id = setTimeout(async () => {
      try {
        const list = await searchBuyers(query);
        setBuyers({ q: query, list: list.map((b) => ({ ...b, source: "buyers" as const })) });
      } catch {
        /* offline — local contacts still work */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, open]);

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const local: Match[] = [];
    for (const c of saved) {
      const hit =
        c.name.toLowerCase().includes(query) ||
        (queryDigits.length >= 4 && c.phones.some((p) => p.replace(/\D/g, "").includes(queryDigits)));
      if (hit) local.push({ name: c.name, phone: c.phones[0], source: "contacts" });
      if (local.length >= 6) break;
    }
    const seen = new Set(local.map((m) => normalizePhone(m.phone)));
    const fromServer = buyers.q === query ? buyers.list.filter((b) => !seen.has(normalizePhone(b.phone))) : [];
    return [...local, ...fromServer];
  }, [query, queryDigits, saved, buyers]);

  const choose = (n: string, phones: string[]) => {
    if (n) onName(n);
    onPhone(phones[0] ?? "");
    setOtherPhones(phones.slice(1));
    setOpen(false);
  };

  const openPhoneContacts = async () => {
    const [c] = await pickContacts(false);
    if (c) choose(c.name, c.phones);
  };

  const importFile = async (file: File) => {
    const list = parseVcf(await file.text());
    if (list.length === 0) {
      setNotice("No contacts with phone numbers found in that file.");
      return;
    }
    saveContacts(list);
    setNotice(`${list.length} contacts imported. Start typing a name to find someone.`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {canPick && (
          <button type="button" onClick={openPhoneContacts} className="btn-secondary w-full">
            📱 Choose from phone contacts
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary w-full">
          {saved.length > 0 ? `📇 Re-import contacts (${saved.length} saved)` : "📇 Import contacts file"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {notice && <p className="text-xs text-ok">{notice}</p>}
      {saved.length === 0 && !canPick && (
        <p className="text-xs text-muted">
          This browser can&apos;t open your phone&apos;s contacts directly. Export your contacts as a .vcf file
          (iPhone: Contacts → Lists → long-press All Contacts → Export; Google: contacts.google.com → Export → vCard) and import
          it once. They stay on this device only.
        </p>
      )}

      <div className="relative">
        <label className="label" htmlFor="buyer_name">Buyer&apos;s name</label>
        <input
          id="buyer_name"
          name="buyer_name"
          required
          value={name}
          onChange={(e) => {
            onName(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="input"
          autoComplete="off"
          placeholder={saved.length > 0 ? "Type to search your contacts" : "Type to search past buyers"}
        />
        {open && matches.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface shadow-xl">
            {matches.map((m) => (
              <li key={`${m.source}-${m.phone}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const all = m.source === "contacts" ? (saved.find((c) => c.name === m.name)?.phones ?? [m.phone]) : [m.phone];
                    choose(m.name, all);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.name}</span>
                    <span className="block text-xs text-muted">{formatPhone(normalizePhone(m.phone)) || m.phone}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{m.source === "contacts" ? "Contact" : "Past buyer"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label" htmlFor="buyer_phone">WhatsApp number</label>
        <input
          id="buyer_phone"
          name="buyer_phone"
          type="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          className="input"
          placeholder="0803 123 4567"
          autoComplete="off"
        />
        {otherPhones.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Other numbers:</span>
            {otherPhones.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setOtherPhones((list) => [...list.filter((x) => x !== p), phone].filter(Boolean));
                  onPhone(p);
                }}
                className="rounded-lg border border-line px-2.5 py-1 font-medium text-ink"
              >
                {formatPhone(normalizePhone(p)) || p}
              </button>
            ))}
          </div>
        )}
      </div>

      {saved.length > 0 && (
        <button type="button" onClick={clearSavedContacts} className="text-xs text-muted underline">
          Remove imported contacts from this device
        </button>
      )}
    </div>
  );
}
