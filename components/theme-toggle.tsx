"use client";

import * as React from "react";
import { LaptopMinimal, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "repo-scanner-theme";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [preference, setPreference] = React.useState<ThemePreference | null>(null);

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextPreference: ThemePreference = storedTheme === "dark" || storedTheme === "light" || storedTheme === "system"
      ? storedTheme
      : "system";

    applyTheme(resolveTheme(nextPreference));
    setPreference(nextPreference);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (nextPreference === "system") {
        applyTheme(resolveTheme("system"));
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  function setThemePreference(nextPreference: ThemePreference) {
    applyTheme(resolveTheme(nextPreference));
    window.localStorage.setItem(STORAGE_KEY, nextPreference);
    setPreference(nextPreference);
  }

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted p-1">
        <ThemeOption
          active={preference === "system"}
          ariaLabel="Use system theme"
          icon={LaptopMinimal}
          onClick={() => setThemePreference("system")}
        />
        <ThemeOption
          active={preference === "light"}
          ariaLabel="Use light theme"
          icon={Sun}
          onClick={() => setThemePreference("light")}
        />
        <ThemeOption
          active={preference === "dark"}
          ariaLabel="Use dark theme"
          icon={Moon}
          onClick={() => setThemePreference("dark")}
        />
    </div>
  );
}

function ThemeOption({
  active,
  ariaLabel,
  icon: Icon,
  onClick
}: {
  active: boolean;
  ariaLabel: string;
  icon: typeof Sun;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-full p-2.5 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
