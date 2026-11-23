"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { selectEvent } from "@/app/actions/admin";

export function EventSwitcher({
  events,
  currentId,
}: {
  events: { id: string; name: string }[];
  currentId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={selectEvent} ref={formRef}>
      <label className="sr-only" htmlFor="event-switch">Current event</label>
      <select
        id="event-switch"
        name="event_id"
        defaultValue={currentId}
        key={currentId}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full max-w-xs truncate rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-semibold outline-none focus:border-accent"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </form>
  );
}

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "◎", exact: true },
  { href: "/admin/tickets", label: "Tickets", icon: "☰" },
  { href: "/admin/tickets/new", label: "New", icon: "+", primary: true },
  { href: "/admin/scan", label: "Scan", icon: "⌖" },
  { href: "/admin/more", label: "More", icon: "⋯" },
];

export function AdminNav({
  isOwner,
  canManage,
  variant,
}: {
  isOwner: boolean;
  /** False for scanners: no "New ticket". */
  canManage: boolean;
  variant: "top" | "bottom";
}) {
  const pathname = usePathname();
  const items = canManage ? ITEMS : ITEMS.filter((i) => !i.primary);
  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : href === "/admin/tickets"
        ? pathname.startsWith(href) && !pathname.startsWith("/admin/tickets/new")
        : pathname.startsWith(href);

  if (variant === "top") {
    const top = [
      ...items.filter((i) => i.href !== "/admin/more"),
      ...(isOwner
        ? [
            { href: "/admin/events", label: "Events", icon: "" },
            { href: "/admin/branding", label: "Branding", icon: "" },
            { href: "/admin/team", label: "Team", icon: "" },
          ]
        : []),
      { href: "/admin/account", label: "Account", icon: "" },
    ];
    return (
      <div className="flex gap-1">
        {top.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive(i.href, "exact" in i ? i.exact : false)
                ? "bg-surface-2 text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {i.href === "/admin/tickets/new" ? "+ New ticket" : i.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${canManage ? "grid-cols-5" : "grid-cols-4"}`}>
      {items.map((i) => {
        const active =
          i.href === "/admin/more"
            ? ["/admin/more", "/admin/events", "/admin/branding", "/admin/team", "/admin/account"].some((p) =>
                pathname.startsWith(p),
              )
            : isActive(i.href, i.exact);
        if (i.primary)
          return (
            <Link key={i.href} href={i.href} className="flex items-center justify-center py-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-ink">
                +
              </span>
            </Link>
          );
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </div>
  );
}
