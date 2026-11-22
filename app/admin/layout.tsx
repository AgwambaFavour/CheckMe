import Link from "next/link";
import { getCurrentEvent, listEvents, requireStaff } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { AdminNav, EventSwitcher } from "./nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireStaff();
  const [events, current] = await Promise.all([listEvents(me.org_id), getCurrentEvent(me.org_id)]);

  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-black text-accent-ink"
            aria-label="Dashboard"
          >
            ✓
          </Link>
          <div className="min-w-0 flex-1">
            {events.length > 0 ? (
              <EventSwitcher
                events={events.map((e) => ({ id: e.id, name: e.name }))}
                currentId={current?.id ?? ""}
              />
            ) : (
              <span className="text-sm text-muted">No events yet</span>
            )}
          </div>
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium">{me.full_name}</div>
            <div className="text-muted capitalize">{me.role}</div>
          </div>
          <form action={signOut}>
            <button className="btn-secondary px-3 py-2 text-xs">Log out</button>
          </form>
        </div>
        <div className="mx-auto hidden max-w-5xl px-4 pb-2 sm:block">
          <AdminNav isOwner={me.role === "owner"} variant="top" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <AdminNav isOwner={me.role === "owner"} variant="bottom" />
      </nav>
    </div>
  );
}
