"use client"

import { useState, useCallback, useEffect, startTransition } from "react"
import { useShallow } from "zustand/react/shallow"
import { useExploreConfigStore } from "@/stores/explore-config"
import { useDatasetRegistryStore } from "@/stores/dataset-registry"
import type { DatasetColumn } from "@/stores/dataset-registry"
import { useDashboardsStore } from "@/stores/dashboards"
import { useDatasetStore } from "@/stores/dataset"
import { useSchema } from "@/hooks/use-query-orchestrator"
import { useLang } from "@/components/lang-provider"
import { ExploreLeftPanel } from "@/components/explore/explore-left-panel"
import { ExploreChartPreview } from "@/components/explore/explore-chart-preview"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { ExploreConfig } from "@/lib/metric-types"
import type { ChartConfig } from "@/lib/chart-types"
import type { ColumnMeta } from "@/lib/types"

function schemaToDatasetColumns(schema: ColumnMeta[]): DatasetColumn[] {
  return schema.map((c) => ({
    name: c.name,
    type: c.type,
    isTime: c.type.includes("Date") || c.type.includes("Time"),
    role: c.type.match(/Int|UInt|Float|Decimal/) ? ("metric" as const) : ("dimension" as const),
  }))
}

export function ExplorePanel() {
  const { _t } = useLang()

  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

  const datasets = useDatasetRegistryStore((s) => s.datasets)
  const createDataset = useDatasetRegistryStore((s) => s.createDataset)

  const config = useExploreConfigStore((s) => s.config)
  const initExplore = useExploreConfigStore((s) => s.initExplore)
  const addMetric = useExploreConfigStore((s) => s.addMetric)
  const removeMetric = useExploreConfigStore((s) => s.removeMetric)
  const addDimension = useExploreConfigStore((s) => s.addDimension)
  const removeDimension = useExploreConfigStore((s) => s.removeDimension)
  const setTimeConfig = useExploreConfigStore((s) => s.setTimeConfig)
  const setAnalytics = useExploreConfigStore((s) => s.setAnalytics)

  const activeDashboardId = useDashboardsStore((s) => s.activeDashboardId)
  const addWidget = useDashboardsStore((s) => s.addWidget)

  const { selectedTable, selectedDatabase } = useDatasetStore(
    useShallow((s) => ({
      selectedTable: s.selectedTable,
      selectedDatabase: s.selectedDatabase,
    }))
  )

  const schema = useSchema()

  const selectedDataset = selectedDatasetId
    ? datasets.find((d) => d.id === selectedDatasetId) ?? null
    : null

  const handleDatasetChange = useCallback(
    (id: string) => {
      setSelectedDatasetId(id)
      initExplore(id)
    },
    [initExplore]
  )

  const pendingDatasetId = useExploreConfigStore((s) => s.pendingDatasetId)
  const clearPendingDatasetId = useExploreConfigStore((s) => s.clearPendingDatasetId)

  useEffect(() => {
    if (pendingDatasetId) {
      startTransition(() => {
        setSelectedDatasetId(pendingDatasetId)
        initExplore(pendingDatasetId)
        clearPendingDatasetId()
      })
    }
  }, [pendingDatasetId, initExplore, clearPendingDatasetId])

  const handleCreateFromTable = useCallback(() => {
    if (!selectedTable || !schema.length) return
    const id = createDataset({
      name: selectedTable,
      type: "physical",
      database: selectedDatabase,
      table: selectedTable,
      columns: schemaToDatasetColumns(schema),
    })
    setSelectedDatasetId(id)
    initExplore(id)
  }, [selectedTable, selectedDatabase, schema, createDataset, initExplore])

  const handleAddWidget = useCallback(
    (widget: {
      id: string
      sql: string
      vizConfig: ChartConfig
      datasetId: string
      exploreConfig: ExploreConfig
    }) => {
      if (!activeDashboardId) return
      addWidget(activeDashboardId, {
        id: widget.id,
        type: "chart",
        sql: widget.sql,
        vizConfig: widget.vizConfig,
        source: "agent-chat",
        lastRunAt: Date.now(),
        datasetId: widget.datasetId,
        exploreConfig: widget.exploreConfig,
      })
    },
    [activeDashboardId, addWidget]
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar: dataset selector */}
      <div className="shrink-0 flex items-center gap-2 pb-2 border-b border-border mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{_t("explore.dataset")}:</span>
          <Select
            value={selectedDatasetId ?? ""}
            onValueChange={(v) => v && handleDatasetChange(v)}
          >
            <SelectTrigger className="h-7 text-[10px] w-44">
              <SelectValue placeholder={_t("explore.no_dataset")} />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTable && (
          <Button
            size="xs"
            variant="outline"
            onClick={handleCreateFromTable}
            className="h-7 text-[10px]"
          >
            {_t("explore.create_from_table")}
          </Button>
        )}
      </div>

      {/* Left panel + Chart preview */}
      <div className="flex-1 flex min-h-0">
        <ExploreLeftPanel
          dataset={selectedDataset}
          config={config}
          onAddMetric={addMetric}
          onRemoveMetric={removeMetric}
          onAddDimension={addDimension}
          onRemoveDimension={removeDimension}
           onSetTimeConfig={setTimeConfig}
           onSetAnalytics={setAnalytics}
        />
        <ExploreChartPreview
          dataset={selectedDataset}
          config={config}
          activeDashboardId={activeDashboardId}
          onAddWidget={handleAddWidget}
        />
      </div>
    </div>
  )
}
