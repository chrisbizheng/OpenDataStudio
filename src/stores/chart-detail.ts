import { create } from "zustand"
import type { DeepDiveItem } from "@/lib/deep-dive-directions"

interface ChartDetailState {
  clickedChart: { messageIndex: number; item: DeepDiveItem } | null
  deepDiveOpen: boolean
  aiDirections: { label: string; prompt: string }[] | null
  isGeneratingDirections: boolean

  setClickedChart: (v: { messageIndex: number; item: DeepDiveItem } | null) => void
  setDeepDiveOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  setAiDirections: (v: { label: string; prompt: string }[] | null) => void
  setGeneratingDirections: (v: boolean) => void
  resetChartDetail: () => void
}

export const useChartDetailStore = create<ChartDetailState>((set) => ({
  clickedChart: null,
  deepDiveOpen: false,
  aiDirections: null,
  isGeneratingDirections: false,

  setClickedChart: (clickedChart) => set({ clickedChart }),
  setDeepDiveOpen: (deepDiveOpen) =>
    set((s) => ({
      deepDiveOpen: typeof deepDiveOpen === "function" ? deepDiveOpen(s.deepDiveOpen) : deepDiveOpen,
    })),
  setAiDirections: (aiDirections) => set({ aiDirections }),
  setGeneratingDirections: (isGeneratingDirections) => set({ isGeneratingDirections }),
  resetChartDetail: () =>
    set({ clickedChart: null, deepDiveOpen: false, aiDirections: null, isGeneratingDirections: false }),
}))
