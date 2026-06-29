"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "teal" | "blue";

const STORAGE_KEY = "is-color-theme";

function getInitialColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "teal";
  const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
  return stored === "blue" ? "blue" : "teal";
}

function applyColorTheme(theme: ColorTheme) {
  if (theme === "blue") {
    document.documentElement.setAttribute("data-color-theme", "blue");
  } else {
    document.documentElement.removeAttribute("data-color-theme");
  }
}

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(getInitialColorTheme);

  useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, []);

  return { colorTheme, setColorTheme };
}
