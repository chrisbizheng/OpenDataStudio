export interface TableMeta {
  name: string
  rowCount: number
  engine: string
  comment?: string
}

export interface ColumnMeta {
  name: string
  type: string
  comment?: string
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  stats: { elapsed: number; rowsRead: number; bytesRead: number }
}
