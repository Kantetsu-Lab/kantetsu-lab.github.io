import type { Metadata } from "next";
import { DotGothic16, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const pixelFont = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  variable: "--font-pixel",
  display: "swap",
});

const bodyFont = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-body",
  display: "swap",
});

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
    <html
      lang="ja"
      className={`${pixelFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1 pt-14">{children}</main>
        <footer className="border-t-3 border-line py-10" style={{ borderTopWidth: 3 }}>
          <div className="mx-auto max-w-5xl px-6 text-xs text-muted">
            <p className="font-pixel text-sm">© {new Date().getFullYear()} Kaito Shimomura</p>
            <p className="mt-1">
              Notion を CMS に、Next.js と GitHub Pages で構築。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
