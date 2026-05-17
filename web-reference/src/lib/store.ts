import { create } from "zustand"
import { devtools } from "zustand/middleware"

// ─── Example store — feature stores follow this pattern ─────────────────────

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 }), false, "increment"),
      decrement: () => set((s) => ({ count: s.count - 1 }), false, "decrement"),
      reset: () => set({ count: 0 }, false, "reset"),
    }),
    { name: "counter" },
  ),
)
