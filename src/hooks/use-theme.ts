import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/lib/profile";

type Theme = "light" | "dark";

const THEME_KEY = "azime-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const profileTheme = useProfile((s) => s.profile?.theme);
  const updateProfile = useProfile((s) => s.updateProfile);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (profileTheme as Theme) ?? getStoredTheme();
  });

  // Sync when profile loads (per-user override)
  useEffect(() => {
    if (profileTheme === "light" || profileTheme === "dark") {
      setThemeState(profileTheme);
    }
  }, [profileTheme]);

  // Apply to DOM + persist to localStorage + profile
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    // Persist to profile (fire-and-forget)
    const current = useProfile.getState().profile;
    if (current && current.theme !== theme) {
      updateProfile({ theme });
    }
  }, [theme, updateProfile]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
