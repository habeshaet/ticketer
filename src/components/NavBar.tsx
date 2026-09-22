"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Compose" },
  { href: "/directory", label: "Directory" },
  { href: "/flights", label: "Flights" },
  { href: "/history", label: "History" },
];

export const THEMES = [
  {
    id: "emerald",
    name: "Emerald",
    color: "#059669",
    description: "Classic aviation green",
  },
  {
    id: "indigo",
    name: "Indigo",
    color: "#4f46e5",
    description: "Royal navy & indigo",
  },
  {
    id: "amber",
    name: "Amber",
    color: "#d97706",
    description: "Warm gold & amber",
  },
  {
    id: "rose",
    name: "Rose",
    color: "#e11d48",
    description: "Vibrant ruby crimson",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function NavBar() {
  const pathname = usePathname();
  const [colorTheme, setColorTheme] = useState<ThemeId>("emerald");
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Load color theme
    const savedTheme = localStorage.getItem("tm_color_theme") as ThemeId;
    if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
      document.documentElement.setAttribute("data-theme", savedTheme);
      setColorTheme(savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "emerald");
      setColorTheme("emerald");
    }

    // Load light/dark mode
    const savedMode = localStorage.getItem("tm_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedMode === "dark" || (!savedMode && prefersDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
      setMode("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setMode("light");
    }
  }, []);

  function selectTheme(themeId: ThemeId) {
    setColorTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("tm_color_theme", themeId);
  }

  function toggleMode() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tm_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tm_theme", "light");
    }
  }

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
        <div className="ml-auto flex items-center gap-2">
          <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
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

          {/* Theme selector (maximum 4 contrasting themes) */}
          <div
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            role="radiogroup"
            aria-label="Color themes"
          >
            {THEMES.map((t) => {
              const isSelected = colorTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectTheme(t.id)}
                  aria-label={`${t.name} theme: ${t.description}`}
                  title={`${t.name} theme - ${t.description}`}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    isSelected
                      ? "scale-110 shadow-sm ring-2 ring-slate-400 dark:ring-slate-300"
                      : "opacity-60 hover:scale-105 hover:opacity-100"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full shadow-inner transition-transform"
                    style={{ backgroundColor: t.color }}
                  />
                  {isSelected ? (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Dark / Light mode toggle */}
          <button
            type="button"
            onClick={toggleMode}
            aria-label="Toggle dark mode"
            title={mode === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
          >
            {mode === "light" ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
