import { tokenize } from "./ch-context";

export interface TableEntry {
  raw: string;
  db?: string;
  table: string;
  alias?: string;
}

export function scanFromJoinAliases(sql: string): Map<string, TableEntry> {
  const map = new Map<string, TableEntry>();
  const tokens = tokenize(sql);

  const acceptTable = (fullRaw: string, aliasCandidate?: string) => {
    const parts = fullRaw.split(".");
    const entry: TableEntry = {
      raw: fullRaw,
      table: parts.length > 1 ? parts[parts.length - 1] : parts[0],
      db: parts.length > 1 ? parts[0] : undefined,
      alias: aliasCandidate,
    };
    const key = aliasCandidate ?? entry.table;
    map.set(key, entry);
    if (aliasCandidate) map.set(entry.table, entry);
  };

  let inFrom = false;
  let inJoin = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const w = t.type === "word" ? t.value.toUpperCase() : null;

    if (w === "FROM") { inFrom = true; inJoin = false; continue; }
    if (w === "JOIN" || w === "ARRAY") { inJoin = true; continue; }
    if (w === "INNER" || w === "LEFT" || w === "RIGHT" || w === "CROSS" || w === "FULL") {
      continue;
    }
    if (w === "ON" || w === "WHERE" || w === "SETTINGS" || w === "FORMAT" ||
        w === "ORDER" || w === "GROUP" || w === "LIMIT" || w === "HAVING" ||
        w === "PREWHERE" || w === "INTO" || w === "UNION") {
      inFrom = false; inJoin = false; continue;
    }

    if ((inFrom || inJoin) && t.type === "word") {
      let raw = t.value;
      let alias: string | undefined;
      // tbl [AS] alias
      const remaining = tokens.slice(i + 1);
      if (remaining[0]?.type === "word" && remaining[0].value.toUpperCase() === "AS" && remaining[1]?.type === "word") {
        alias = remaining[1].value;
        i += 2;
      } else if (remaining[0]?.type === "word" && remaining[1]?.type !== "dot" && remaining[1]?.type !== "lparen") {
        alias = remaining[0].value;
        i += 1;
      }
      acceptTable(raw, alias);
      inFrom = inJoin; // comma-separated FROM tables continue
    }
  }
  return map;
}
