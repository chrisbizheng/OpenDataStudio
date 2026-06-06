export interface CommunityQuery {
  name: string
  sql: string
  description: string
}

export const communityQueries: CommunityQuery[] = [
  {
    name: "Table Sizes",
    sql: "SELECT database, name, total_rows, formatReadableSize(total_bytes) AS size\nFROM system.tables\nWHERE database NOT IN ('system', 'INFORMATION_SCHEMA')\nORDER BY total_bytes DESC",
    description: "All tables sorted by size",
  },
  {
    name: "Top 10 Largest Tables",
    sql: "SELECT database, name, total_rows, formatReadableSize(total_bytes) AS size\nFROM system.tables\nWHERE database NOT IN ('system', 'INFORMATION_SCHEMA') AND total_rows > 0\nORDER BY total_bytes DESC\nLIMIT 10",
    description: "10 largest tables by data size",
  },
  {
    name: "Recent Queries",
    sql: "SELECT query_id, user, query, elapsed, formatReadableSize(memory_usage) AS memory, read_rows, written_rows\nFROM system.query_log\nWHERE type = 'QueryFinish'\nORDER BY event_time DESC\nLIMIT 20",
    description: "Last 20 completed queries",
  },
  {
    name: "Running Queries",
    sql: "SELECT query_id, user, query, elapsed, formatReadableSize(memory_usage) AS memory\nFROM system.processes\nORDER BY elapsed DESC",
    description: "Currently running queries",
  },
  {
    name: "Column Stats (current table)",
    sql: "SELECT name, type, formatReadableSize(data_compressed_bytes) AS compressed, formatReadableSize(data_uncompressed_bytes) AS uncompressed\nFROM system.columns\nWHERE database = currentDatabase() AND table = 'table_name'\nORDER BY position",
    description: "Per-column storage stats (change table_name)",
  },
  {
    name: "Disk Usage by DB",
    sql: "SELECT database, formatReadableSize(sum(total_bytes)) AS total_size\nFROM system.tables\nWHERE database NOT IN ('system', 'INFORMATION_SCHEMA')\nGROUP BY database\nORDER BY sum(total_bytes) DESC",
    description: "Storage per database",
  },
  {
    name: "MergeTree Parts",
    sql: "SELECT database, table, count() AS parts, formatReadableSize(sum(bytes_on_disk)) AS size\nFROM system.parts\nWHERE active\nGROUP BY database, table\nORDER BY sum(bytes_on_disk) DESC\nLIMIT 20",
    description: "Active MergeTree parts per table",
  },
  {
    name: "Slow Queries",
    sql: "SELECT query_id, user, substring(query, 1, 100) AS query_preview, elapsed, read_rows, written_rows\nFROM system.query_log\nWHERE type = 'QueryFinish' AND elapsed > 1\nORDER BY elapsed DESC\nLIMIT 20",
    description: "Queries that took > 1 second",
  },
]
