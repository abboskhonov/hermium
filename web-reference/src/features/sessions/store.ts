import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface SessionsStore {
  activeSessionId: string | null
  sidebarOpen: boolean
  searchQuery: string

  setActiveSession: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
}

export const useSessionsStore = create<SessionsStore>()(
  devtools(
    persist(
      (set) => ({
        activeSessionId: null,
        sidebarOpen: true,
        searchQuery: "",

        setActiveSession: (id) => set({ activeSessionId: id }, false, "setActiveSession"),
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, "toggleSidebar"),
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, "setSidebarOpen"),
        setSearchQuery: (q) => set({ searchQuery: q }, false, "setSearchQuery"),
      }),
      { name: "hermium-sessions" },
    ),
    { name: "sessions" },
  ),
)
