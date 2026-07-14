"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ホーム", desktopOnly: true },
  { href: "/projects/", label: "Projects" },
  { href: "/fitness/", label: "Fitness" },
  { href: "/#about", label: "自己紹介" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl"
      style={{
        background: "var(--glass)",
        borderBottom: "3px solid var(--line)",
      }}
    >
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="font-pixel whitespace-nowrap text-base font-bold tracking-tight"
        >
          <span className="mr-1 inline-block rounded-md bg-accent px-1.5 py-0.5 text-sm text-white">
            KS
          </span>
          Kaito Shimomura
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href.replace(/\/$/, ""));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-colors duration-200 ${
                  link.desktopOnly ? "hidden md:block " : ""
                }${
                  active
                    ? "bg-line text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
