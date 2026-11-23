import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/utils";

export default async function MorePage() {
  const me = await requireStaff();
  const links = [
    ...(me.role === "owner"
      ? [
          { href: "/admin/events#prices", title: "Ticket prices", desc: "Regular, VIP and Table price per person" },
          { href: "/admin/events", title: "Events", desc: "Create, edit or delete events and the WhatsApp message" },
          { href: "/admin/branding", title: "Branding", desc: "Logo, flyer and colours on the tickets" },
          { href: "/admin/team", title: "Team", desc: "Add or remove admins and scanners" },
        ]
      : []),
    {
      href: "/admin/account",
      title: "My account",
      desc: me.role === "owner" ? "Change your password or delete your organisation" : "Change your password",
    },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">More</h1>
      <p className="text-sm text-muted">
        Signed in as <span className="text-ink">{me.full_name}</span> ({roleLabel(me.role)})
      </p>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="card block hover:border-muted">
          <div className="font-semibold">{l.title}</div>
          <div className="text-sm text-muted">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}
