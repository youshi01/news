"use client";

import { Moon, Newspaper, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const themes = [
  { key: "classic", label: "Classic", zhLabel: "经典", icon: Newspaper },
  { key: "midnight", label: "Midnight", zhLabel: "深色", icon: Moon },
  { key: "paper", label: "Paper", zhLabel: "报纸", icon: Sun }
] as const;

type ThemeKey = (typeof themes)[number]["key"];

type ThemeSwitcherProps = {
  language?: "en" | "zh";
};

export function ThemeSwitcher({ language = "en" }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<ThemeKey>("classic");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("theme");
      const initial = themes.some((item) => item.key === saved)
        ? (saved as ThemeKey)
        : "classic";
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    } catch {
      document.documentElement.dataset.theme = "classic";
    }
  }, []);

  function applyTheme(next: ThemeKey) {
    setTheme(next);
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Theme selection still applies for this page even if storage is blocked.
    }
    document.documentElement.dataset.theme = next;
  }

  return (
    <div className="theme-switcher" aria-label="Theme selector">
      {themes.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            type="button"
            className={theme === item.key ? "active" : ""}
            onClick={() => applyTheme(item.key)}
            title={language === "zh" ? `${item.zhLabel}主题` : `${item.label} theme`}
          >
            <Icon size={15} />
            <span>{language === "zh" ? item.zhLabel : item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
