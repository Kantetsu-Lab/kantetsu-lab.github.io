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
      className="fixed inset-x-0 top-0 z-50 border-b border-border-soft backdrop-blur-xl"
      style={{ background: "var(--glass)" }}
    >
      <nav className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-semibold tracking-tight"
        >
          Kaito Shimomura
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href.replace(/\/$/, ""));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-xs transition-colors duration-200 ${
                  link.desktopOnly ? "hidden md:block " : ""
                }${
                  active ? "text-foreground font-medium" : "text-muted hover:text-foreground"
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
