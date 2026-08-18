import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const SYSTEM_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(defaultTheme: Theme): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return defaultTheme;
  return window.matchMedia(SYSTEM_MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference, defaultTheme: Theme): Theme {
  return preference === "system" ? getSystemTheme(defaultTheme) : preference;
}

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (!switchable || typeof window === "undefined") return defaultTheme;
    const storedPreference = localStorage.getItem("appearance-preference");
    if (storedPreference === "system" || storedPreference === "light" || storedPreference === "dark") return storedPreference;

    // Preserve the prior explicit setting for returning learners, then let new
    // learners follow the operating-system appearance by default.
    const legacyTheme = localStorage.getItem("theme");
    if (legacyTheme === "light" || legacyTheme === "dark") return legacyTheme;
    return "system";
  });
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(preference, defaultTheme));

  useEffect(() => {
    const applyResolvedTheme = () => setTheme(resolveTheme(preference, defaultTheme));
    applyResolvedTheme();

    if (!switchable || preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(SYSTEM_MEDIA_QUERY);
    const handleSystemChange = () => applyResolvedTheme();
    mediaQuery.addEventListener?.("change", handleSystemChange);
    return () => mediaQuery.removeEventListener?.("change", handleSystemChange);
  }, [defaultTheme, preference, switchable]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      root.dataset.appearancePreference = preference;
      root.style.colorScheme = theme;
      localStorage.setItem("theme", theme);
      localStorage.setItem("appearance-preference", preference);
    }
  }, [preference, theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setPreference(theme === "light" ? "dark" : "light");
      }
    : undefined;

  const selectPreference = switchable ? setPreference : () => undefined;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference: selectPreference, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
