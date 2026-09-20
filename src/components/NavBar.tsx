"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Compose" },
  { href: "/directory", label: "Directory" },
  { href: "/flights", label: "Flights" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Templates" },
  { href: "/tools", label: "Desktop app" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {/* the airline mark, on a white disc so it reads on any background */}
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-slate-900">
              Ticket Mailer
            </span>
            <span className="block text-[11px] text-slate-500">
              Tickets, rebooking &amp; dormitory requests
            </span>
          </span>
        </Link>
        <nav className="-mx-1 ml-auto flex flex-1 items-center gap-1 overflow-x-auto px-1 sm:flex-none">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
