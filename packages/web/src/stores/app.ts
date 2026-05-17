import { create } from "zustand"

interface AppState {
  sidebarOpen: boolean
  activeProfile: string
  nodeVersion: string
  models: string[]
  toggleSidebar: () => void
  closeSidebar: () => void
  setActiveProfile: (profile: string) => void
  loadModels: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  activeProfile: "default",
  nodeVersion: typeof process !== "undefined" ? process.version : "",
  models: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  loadModels: async () => {
    try {
      const res = await fetch("/api/hermes/models")
      const data = await res.json()
      set({ models: data.models || [] })
    } catch {
      set({ models: [] })
    }
  },
}))
