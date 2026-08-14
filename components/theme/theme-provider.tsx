"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "traveladvisor:theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    const nextTheme: Theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : "dark";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const updateTheme = (nextTheme: Theme) => {
    window.localStorage.setItem(storageKey, nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem(storageKey, nextTheme);
      return nextTheme;
    });
  };

  return <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
