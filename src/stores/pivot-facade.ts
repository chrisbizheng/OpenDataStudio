import { validate } from "@/lib/calculated-indicator-expression"
import type { PivotConfig, CalculatedIndicator } from "@/lib/pivot-sql"
import { usePivotConfigStore } from "./pivot-config"
import { usePivotExecutionStore } from "./pivot-execution"

export function resetAllPivot() {
  usePivotConfigStore.getState().reset()
  usePivotExecutionStore.getState().reset()
}

export function loadPivotConfig(config: PivotConfig) {
  usePivotConfigStore.getState().loadConfig(config)
  usePivotExecutionStore.getState().clearResult()
}

export function addCalculatedIndicatorWithValidation(indicator: CalculatedIndicator) {
  const configState = usePivotConfigStore.getState()
  const allKeys = [
    ...configState.indicators.map((i) => i.key),
    ...configState.calculatedIndicators.map((c) => c.key),
  ]
  const validation = validate(indicator.logic, allKeys)
  if (!validation.valid) {
    usePivotExecutionStore.getState().setError(validation.errors.join("; "))
    return
  }
  configState.addCalculatedIndicator(indicator)
  usePivotExecutionStore.getState().setError(null)
}
