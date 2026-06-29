"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "teal" | "blue";

const STORAGE_KEY = "is-color-theme";

function applyColorTheme(theme: ColorTheme) {
  if (theme === "blue") {
    document.documentElement.setAttribute("data-color-theme", "blue");
  } else {
    document.documentElement.removeAttribute("data-color-theme");
  }
}

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("teal");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    const initial = stored === "blue" ? "blue" : "teal";
    setColorThemeState(initial);
    applyColorTheme(initial);
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    applyColorTheme(theme);
  }, []);

  return { colorTheme, setColorTheme };
}
