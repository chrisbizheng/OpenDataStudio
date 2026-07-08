"use client"

import { CalculatedIndicatorDialog } from "./calculated-indicator-dialog"
import { IndicatorFormatDialog } from "./indicator-format-dialog"
import type { CalculatedIndicator, PivotIndicator } from "@/lib/pivot-sql"
import type { TableRef } from "@/lib/types"

interface PivotConfigDialogsProps {
  showCalcDialog: boolean
  setShowCalcDialog: (open: boolean) => void
  editingCalc: CalculatedIndicator | undefined
  formatIndicatorKey: string | undefined
  setFormatIndicatorKey: (key: string | undefined) => void
  formatIndicator: PivotIndicator | undefined
  calcOnSave: (calc: CalculatedIndicator) => void
  formatOnSave: (format: "number" | "percent" | "currency", decimals: number) => void
  indicators: PivotIndicator[]
  calculatedIndicators: CalculatedIndicator[]
  tableRef: TableRef
}

export function PivotConfigDialogs({
  showCalcDialog,
  setShowCalcDialog,
  editingCalc,
  formatIndicatorKey,
  setFormatIndicatorKey,
  formatIndicator,
  calcOnSave,
  formatOnSave,
  indicators,
  calculatedIndicators,
  tableRef,
}: PivotConfigDialogsProps) {
  return (
    <>
      <CalculatedIndicatorDialog
        key={editingCalc?.key ?? "new-calculated-indicator"}
        open={showCalcDialog}
        onOpenChange={setShowCalcDialog}
        existing={editingCalc}
        availableIndicators={indicators}
        existingCalculated={calculatedIndicators}
        tableRef={tableRef}
        onSave={calcOnSave}
      />

      <IndicatorFormatDialog
        key={formatIndicatorKey ?? "format-dialog"}
        open={!!formatIndicatorKey}
        onOpenChange={(open) => { if (!open) setFormatIndicatorKey(undefined) }}
        indicator={formatIndicator}
        onSave={formatOnSave}
      />
    </>
  )
}
