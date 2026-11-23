"use client";

import { useSyncExternalStore } from "react";

/**
 * Contacts for the new-ticket form.
 * - Android Chrome: the phone's own Contact Picker.
 * - Everywhere else (iPhone, computers): browsers don't allow reading contacts, so staff
 *   can import a contacts file (.vcf) once. It's kept only on this device and searched by name.
 */
type ContactInfo = { name?: string[]; tel?: string[] };
type ContactsManager = {
  select(props: ("name" | "tel")[], options?: { multiple?: boolean }): Promise<ContactInfo[]>;
};

export type PickedContact = { name: string; phones: string[] };

function manager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const m = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  return m && typeof m.select === "function" ? m : null;
}

const noop = () => () => {};

/** True where the phone's contact list can be opened. Always false during server render. */
export function useContactPicker() {
  return useSyncExternalStore(noop, () => manager() !== null, () => false);
}

/** Opens the phone's contact list. Returns [] if the person cancels. */
export async function pickContacts(multiple: boolean): Promise<PickedContact[]> {
  const m = manager();
  if (!m) return [];
  try {
    const picked = await m.select(["name", "tel"], { multiple });
    return picked.map((c) => ({
      name: (c.name ?? []).map((n) => n.trim()).find(Boolean) ?? "",
      phones: [...new Set((c.tel ?? []).map((t) => t.trim()).filter(Boolean))],
    }));
  } catch {
    return []; // cancelled, or the picker was already open
  }
}

// ───────────── Imported contacts (.vcf), saved on this device ─────────────

const STORE_KEY = "checkme_contacts";
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: PickedContact[] } = { raw: null, list: [] };

function readStore(): PickedContact[] {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw !== cache.raw) {
    try {
      cache = { raw, list: raw ? (JSON.parse(raw) as PickedContact[]) : [] };
    } catch {
      cache = { raw, list: [] };
    }
  }
  return cache.list;
}

const EMPTY: PickedContact[] = [];

/** Contacts imported on this device. */
export function useSavedContacts() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    readStore,
    () => EMPTY,
  );
}

export function saveContacts(list: PickedContact[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  listeners.forEach((l) => l());
}

export function clearSavedContacts() {
  localStorage.removeItem(STORE_KEY);
  listeners.forEach((l) => l());
}

function unescapeVcf(v: string) {
  return v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Read the contacts out of a .vcf file (as exported by iPhone, Android or Google Contacts). */
export function parseVcf(text: string): PickedContact[] {
  // Long lines are folded onto the next line starting with a space or tab.
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const out: PickedContact[] = [];
  for (const card of unfolded.split(/BEGIN:VCARD/i).slice(1)) {
    let fn = "";
    let n = "";
    const phones: string[] = [];
    for (const line of card.split("\n")) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).toUpperCase();
      const value = line.slice(idx + 1);
      const base = key.split(";")[0].replace(/^ITEM\d+\./, "");
      if (base === "FN") fn = unescapeVcf(value);
      else if (base === "N") {
        const [last = "", first = ""] = value.split(";").map(unescapeVcf);
        n = [first, last].filter(Boolean).join(" ");
      } else if (base === "TEL") {
        const tel = value.replace(/^tel:/i, "").trim();
        if (tel.replace(/\D/g, "").length >= 7) phones.push(tel);
      }
    }
    const name = fn || n;
    if (name && phones.length) out.push({ name, phones: [...new Set(phones)] });
  }
  return out;
}
