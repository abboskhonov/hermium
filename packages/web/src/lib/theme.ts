const THEME_KEY = "hermium-theme"

type Theme = "light" | "dark" | "system"

export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === "dark" || raw === "light" || raw === "system") return raw
  } catch { /* storage unavailable */ }
  return "system"
}

export function storeTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme)
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return theme
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function toggleTheme(): Theme {
  const current = getStoredTheme()
  const resolved = resolveTheme(current)
  const next: Theme = resolved === "dark" ? "light" : "dark"
  storeTheme(next)
  applyTheme(next)
  return next
}
