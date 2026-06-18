export interface SeriesConfig {
  yKey: string
  chartType?: string
  label?: string
}

export interface VisualizationConfig {
  type: string
  config: {
    xKey: string
    yKey?: string
    series?: SeriesConfig[]
    title?: string
    showLegend?: boolean
    height?: number
  }
}

export type RawViz = {
  type?: string
  config?: {
    xKey?: string
    yKey?: string
    series?: SeriesConfig[]
    title?: string
    showLegend?: boolean
    height?: number
  }
} | null | undefined

export interface ChartConfig {
  type: string
  xKey: string
  yKey?: string
  series?: SeriesConfig[]
  title?: string
  showLegend?: boolean
  height?: number
  axis?: {
    xAxisName?: string
    xAxisRotate?: number
    xAxisHide?: boolean
    yAxisName?: string
    yAxisUnit?: string
    yAxisMin?: number
    yAxisMax?: number
    yAxisHide?: boolean
    dualYAxis?: boolean
  }
  style?: {
    barRadius?: number
    barWidth?: number
    lineSmooth?: boolean
    areaFill?: boolean
    lineMarkPoint?: boolean
    pieDonut?: boolean
    pieRadius?: number
    colorTheme?: string
    // Background & Grid
    canvasBg?: string
    chartBg?: string
    gridPaddingLeft?: number
    gridPaddingRight?: number
    gridPaddingTop?: number
    gridPaddingBottom?: number
    gridBorderWidth?: number
    gridBorderColor?: string
    // Split Line
    splitLineShow?: boolean
    splitLineColor?: string
    splitLineType?: string
    // Animation
    animationDuration?: number
    // Scatter-specific
    scatterSymbolSize?: number
    scatterSymbol?: string
    // Radar-specific
    radarShape?: string
    radarSplitNumber?: number
    // RadialBar-specific
    radialStartAngle?: number
    radialEndAngle?: number
    // Treemap-specific
    treemapLeafDepth?: number
    treemapBreadcrumb?: boolean
  }
  label?: {
    showDataLabels?: boolean
    showTotalLabel?: boolean
    numberFormat?: string
    decimalPlaces?: number
  }
  jsonOverride?: string
}
