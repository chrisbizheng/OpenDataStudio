import type { QueryResult } from "./types"
import type { PivotConfig } from "./pivot-sql"
import { generatePivotSQL } from "./pivot-sql"

export type PivotExecutionEvent =
  | { type: "started" }
  | { type: "succeeded"; sql: string; result: QueryResult; config: PivotConfig }
  | { type: "error"; sql: string; message: string }
  | { type: "aborted" }

export interface PivotExecutionInput {
  config: PivotConfig
  tableName: string
  database: string
}

export interface PivotExecutionDeps {
  executeSql: (sql: string, database?: string) => Promise<QueryResult | null>
}

export async function* runPivotExecution(
  input: PivotExecutionInput,
  deps: PivotExecutionDeps
): AsyncGenerator<PivotExecutionEvent> {
  yield { type: "started" }

  const sql = generatePivotSQL(input.config, input.tableName, input.database)

  try {
    const result = await deps.executeSql(sql, input.database)
    if (result === null) {
      yield { type: "aborted" }
      return
    }
    yield { type: "succeeded", sql, result, config: input.config }
  } catch (e) {
    const message = e instanceof Error ? e.message : "网络错误"
    yield { type: "error", sql, message }
  }
}
