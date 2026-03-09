import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Repo Scanner",
  description: "Retrospective AI usage analytics across local repositories, currently focused on Codex workflows."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const storageKey = "repo-scanner-theme";
                const stored = window.localStorage.getItem(storageKey);
                const preference = stored === "dark" || stored === "light" || stored === "system"
                  ? stored
                  : "system";
                const theme = preference === "system"
                  ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                  : preference;
                document.documentElement.classList.toggle("dark", theme === "dark");
                document.documentElement.style.colorScheme = theme;
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
