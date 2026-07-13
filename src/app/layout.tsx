import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "Kaito Shimomura — Portfolio",
    template: "%s — Kaito Shimomura",
  },
  description:
    "AI で開発した作品と日々の運動記録をまとめたポートフォリオサイト。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1 pt-12">{children}</main>
        <footer className="border-t border-border-soft py-10">
          <div className="mx-auto max-w-5xl px-6 text-xs text-muted">
            <p>© {new Date().getFullYear()} Kaito Shimomura</p>
            <p className="mt-1">
              Notion を CMS に、Next.js と GitHub Pages で構築。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
