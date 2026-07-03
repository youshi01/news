"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const themes = ["classic", "midnight", "paper"] as const;

export function ThemeToggle() {
  const [theme, setTheme] = useState<(typeof themes)[number]>("classic");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("theme");
      const initial = themes.includes(saved as (typeof themes)[number])
        ? (saved as (typeof themes)[number])
        : "classic";
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    } catch {
      document.documentElement.dataset.theme = "classic";
    }
  }, []);

  function rotateTheme() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Keep the visual theme change even when browser storage is unavailable.
    }
    document.documentElement.dataset.theme = next;
  }

  const Icon = theme === "midnight" ? Moon : theme === "paper" ? Sun : Palette;

  return (
    <button
      className="icon-button"
      type="button"
      onClick={rotateTheme}
      aria-label="Switch theme"
      title={`Theme: ${theme}`}
    >
      <Icon size={18} />
    </button>
  );
}
