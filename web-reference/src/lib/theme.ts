export type Theme = "light" | "dark" | "system"

const THEME_KEY = "hermium-theme"

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {}
  return "system"
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === "system" ? getSystemTheme() : theme
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function getResolvedTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme
}

/** Debug helper — returns what the browser reports */
export function getThemeDebugInfo() {
  return {
    stored: getStoredTheme(),
    systemPrefers: getSystemTheme(),
    resolved: getResolvedTheme(getStoredTheme()),
    darkClassPresent: typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : null,
  }
}
