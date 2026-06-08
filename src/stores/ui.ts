import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UiState {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  pivotView: "grid" | "pivot"
  sidebarWidth: number
  rightPanelWidth: number
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setPivotView: (view: "grid" | "pivot") => void
  setSidebarWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      rightPanelOpen: true,
      pivotView: "grid",
      sidebarWidth: 240,
      rightPanelWidth: 380,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setPivotView: (view) => set({ pivotView: view }),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    }),
    { name: "ui-state" }
  )
)