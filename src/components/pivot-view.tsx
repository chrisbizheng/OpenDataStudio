"use client"

import { useCallback, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useShallow } from "zustand/react/shallow"
import { PivotConfigPanel } from "@/components/pivot-config"
import { PivotGrid } from "@/components/pivot-grid"
import { DrilldownDrawer } from "@/components/drilldown-drawer"
import { usePivotExecutionStore } from "@/stores/pivot-execution"
import { usePivotOrchestrator } from "@/hooks/use-pivot-orchestrator"
import { SqlPreviewDialog } from "@/components/sql-preview-dialog"
import type { PivotDragItem } from "@/lib/pivot-dnd"
import type { PivotDropZone } from "@/lib/pivot-dnd"
import type { TableRef } from "@/lib/types"

interface PivotViewProps {
  tableRef: TableRef
  onDrilldown: (params: { dimensionValues: Record<string, unknown>; indicatorKey: string }) => Promise<{ columns: string[]; rows: unknown[][]; isLoading: boolean }>
}

export function PivotView({
  tableRef,
  onDrilldown,
}: PivotViewProps) {
  const { schema, tableName: selectedTable, database: selectedDatabase } = tableRef
  const [activeDragItem, setActiveDragItem] = useState<PivotDragItem | null>(null)
  const [showSqlPreview, setShowSqlPreview] = useState(false)
  const [previewSql, setPreviewSql] = useState("")
  const [drilldownData, setDrilldownData] = useState<{
    columns: string[]
    rows: unknown[][]
    isLoading: boolean
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  const pivotStore = usePivotExecutionStore(useShallow((s) => ({
    resultData: s.resultData,
    error: s.error,
    lastSQL: s.lastSQL,
  })))

  const {
    pivotConfig,
    generateSQL,
    resolveDragDrop,
  } = usePivotOrchestrator(tableRef)

  const handleViewSql = useCallback(() => {
    const sql = generateSQL()
    setPreviewSql(sql)
    setShowSqlPreview(true)
  }, [generateSQL])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as PivotDragItem | undefined
    if (data) setActiveDragItem(data)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const item = event.active.data.current as PivotDragItem | undefined
      const overId = String(event.over?.id ?? "")
      const zone = overId.startsWith("zone:")
        ? (overId.slice(5) as PivotDropZone)
        : null
      setActiveDragItem(null)
      if (item) resolveDragDrop(item, zone)
    },
    [resolveDragDrop]
  )

  const handleDragCancel = useCallback(() => setActiveDragItem(null), [])

  const handleCellClick = useCallback(
    async (params: { dimensionValues: Record<string, unknown>; indicatorKey: string }) => {
      setDrilldownData({ columns: [], rows: [], isLoading: true })
      const result = await onDrilldown(params)
      setDrilldownData(result)
    },
    [onDrilldown]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 flex gap-2 overflow-hidden">
        <div className="w-80 shrink-0 border border-border rounded-md overflow-hidden">
          <PivotConfigPanel
            tableRef={tableRef}
            onViewSql={handleViewSql}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {pivotStore.error && (
            <div className="text-xs text-destructive p-1.5 bg-destructive/10 rounded mb-1 shrink-0">
              {pivotStore.error}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {selectedTable && selectedDatabase ? (
              <PivotGrid
                config={pivotConfig}
                data={pivotStore.resultData ?? { columns: [], rows: [] }}
                schema={schema}
                hasExecuted={Boolean(pivotStore.lastSQL)}
                onCellClick={handleCellClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                请先选择表
              </div>
            )}
          </div>
          {drilldownData && (
            <DrilldownDrawer
              data={drilldownData}
              schema={schema}
              onClose={() => setDrilldownData(null)}
            />
          )}
        </div>
      </div>
      <DragOverlay>
        {activeDragItem && (
          <div className="rounded border border-border bg-background px-2 py-1 text-xs shadow">
            {activeDragItem.field}
          </div>
        )}
      </DragOverlay>
      <SqlPreviewDialog
        sql={previewSql}
        open={showSqlPreview}
        onClose={() => setShowSqlPreview(false)}
      />
    </DndContext>
  )
}
