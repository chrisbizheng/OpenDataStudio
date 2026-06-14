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
import { useTheme } from "@/components/theme-provider"
import { useLang } from "@/components/lang-provider"
import { DataGrid } from "@/components/data-grid"
import { PivotConfigPanel } from "@/components/pivot-config"
import { PivotGrid } from "@/components/pivot-grid"
import { usePivotStore } from "@/stores/pivot"
import { usePivotOrchestrator } from "@/hooks/use-pivot-orchestrator"
import { SqlPreviewDialog } from "@/components/sql-preview-dialog"
import type { PivotDragItem } from "@/lib/pivot-dnd"
import type { PivotDropZone } from "@/lib/pivot-dnd"
import type { ColumnMeta } from "@/lib/types"

interface PivotViewProps {
  schema: ColumnMeta[]
  selectedTable: string
  selectedDatabase: string
  onDrilldown: (params: { dimensionValues: Record<string, unknown>; indicatorKey: string }) => Promise<{ columns: string[]; rows: unknown[][]; isLoading: boolean }>
}

export function PivotView({
  schema,
  selectedTable,
  selectedDatabase,
  onDrilldown,
}: PivotViewProps) {
  const { resolved } = useTheme()

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

  const pivotStore = usePivotStore(useShallow((s) => ({
    resultData: s.resultData,
    error: s.error,
    lastSQL: s.lastSQL,
  })))

  const {
    pivotConfig,
    generateSQL,
    resolveDragDrop,
  } = usePivotOrchestrator(schema, selectedTable, selectedDatabase)

  const handlePivotExecute = useCallback(() => {}, [])

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
            schema={schema}
            tableName={selectedTable}
            database={selectedDatabase}
            onExecute={handlePivotExecute}
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
                key={resolved}
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
              selectedTable={selectedTable}
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

function DrilldownDrawer({
  data,
  schema,
  selectedTable,
  onClose,
}: {
  data: { columns: string[]; rows: unknown[][]; isLoading: boolean }
  schema: ColumnMeta[]
  selectedTable: string
  onClose: () => void
}) {
  const { _t } = useLang()

  return (
    <div className="shrink-0 max-h-[40%] border-t border-border mt-1 pt-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <span className="text-xs font-semibold">{_t("pivot.drilldown")}</span>
        {!data.isLoading && (
          <span className="text-[10px] text-muted-foreground">
            {data.rows.length} 行
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      {data.isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="inline-block w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <DataGrid
            columns={data.columns}
            rows={data.rows}
            schema={schema}
            selectedTable={selectedTable}
          />
        </div>
      )}
    </div>
  )
}
