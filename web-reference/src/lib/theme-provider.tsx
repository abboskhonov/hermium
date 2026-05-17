import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolved, setResolved] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = getStoredTheme()
    setThemeState(stored)
    applyTheme(stored)
    const isDark =
      stored === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : stored === "dark"
    setResolved(isDark ? "dark" : "light")

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const t = getStoredTheme()
      if (t === "system") {
        applyTheme("system")
        setResolved(e.matches ? "dark" : "light")
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setStoredTheme(t)
    applyTheme(t)
    const isDark =
      t === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : t === "dark"
    setResolved(isDark ? "dark" : "light")
  }, [])

  // During SSR and initial hydration, render children without context wrapper
  // to avoid hydration mismatch. The inline script already set the theme.
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: "system", resolvedTheme: "light", setTheme: () => {} }}
      >
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
