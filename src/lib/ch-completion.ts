import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { keywordCompletionSource, SQLDialect } from "@codemirror/lang-sql";
import { scanFromJoinAliases } from "./ch-schema-resolver";
import { ClickHouse } from "./ch-dialect";

interface ColumnInfo {
  name: string;
  type: string;
  comment?: string;
}

interface TableNames {
  current: string[];       // tables in the current database
  all: { db: string; table: string }[];
}

interface SchemaCache {
  columnsFor(db: string | undefined, table: string): ColumnInfo[];
  tablesForDb(db: string): string[];
  databases: string[];
  tableNames: TableNames;
}

export function createChCompletionSource(cache: SchemaCache) {
  return function chCompletion(ctx: CompletionContext): CompletionResult | null | Promise<CompletionResult | null> {
    const pos = ctx.pos;
    const fullText = ctx.state.sliceDoc(0, pos);

    const wordMatch = ctx.matchBefore(/[\w`.]+$/);
    const prefix = wordMatch?.text ?? "";
    const from = wordMatch?.from ?? pos;

    // ─── alias. —→ column completion ───
    const dotMatch = fullText.match(/([\w`]+)\.\s*$/);
    if (dotMatch) {
      const aliasOrTable = dotMatch[1].replace(/`/g, "");
      const aliases = scanFromJoinAliases(ctx.state.sliceDoc(0));
      const entry = aliases.get(aliasOrTable);

      const cols = entry
        ? cache.columnsFor(entry.db, entry.table)
        : [];

      if (cols.length > 0) {
        return {
          from,
          options: cols.map(c => ({
            label: c.name,
            type: "property",
            detail: c.type,
            info: c.comment ?? c.type,
          })),
          filter: false,
        };
      }

      // fallback: list all known tables as hint
      return {
        from,
        options: cache.tableNames.current.map(t => ({ label: t, type: "type" })),
        filter: false,
      };
    }

    // ─── FROM / JOIN —→ table completion ───
    const fromMatch = fullText.match(/(FROM|JOIN)\s+([\w`.]*)$/i);
    if (fromMatch) {
      const dbPrefixMatch = fullText.match(/(FROM|JOIN)\s+([\w`]+)\.\s*$/i);
      if (dbPrefixMatch) {
        const dbName = dbPrefixMatch[2].replace(/`/g, "");
        const tables = cache.tablesForDb ? cache.tablesForDb(dbName) : [];
        return {
          from,
          options: tables.map(t => ({ label: t, type: "type" })),
          filter: false,
        };
      }
      return {
        from,
        options: cache.tableNames.current.map(t => ({ label: t, type: "type" })),
        filter: false,
      };
    }

    // ─── fallback: keyword completion ───
    return keywordCompletionSource(ClickHouse, true)(ctx);
  };
}
