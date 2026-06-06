import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UiState {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  activeTab: "agent" | "sql" | "schema"
  sidebarWidth: number
  rightPanelWidth: number
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setActiveTab: (tab: "agent" | "sql" | "schema") => void
  setSidebarWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      rightPanelOpen: true,
      activeTab: "schema",
      sidebarWidth: 240,
      rightPanelWidth: 380,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    }),
    { name: "ui-state" }
  )
)