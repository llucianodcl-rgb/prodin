import { useEffect } from "react";
import { useStore } from "../store/useStore";

export function ThemeManager() {
  const { theme } = useStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    // Update the theme-color meta tag dynamically for Status Bar / Navigation Bar
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    // Use white for light theme to blend with the top bar, and slate-900 for dark theme
    const color = theme === "dark" ? "#0f172a" : "#ffffff";
    metaThemeColor.setAttribute("content", color);
  }, [theme]);

  return null;
}
