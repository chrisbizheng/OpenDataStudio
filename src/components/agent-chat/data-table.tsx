"use client"

import { useLang } from "@/components/lang-provider"

export function DataTable({ rows, columns }: { rows: unknown[][]; columns: string[] }) {
  const { _t } = useLang()
  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th key={col} className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, ri) => (
            <tr key={ri} className="border-t border-border">
              {row.map((cell: unknown, ci: number) => (
                <td key={ci} className="px-2 py-1 truncate max-w-[150px]">
                  {String(cell ?? "∅")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border">
          {_t("agent.showing_rows")} {rows.length} {_t("agent.rows")}
        </div>
      )}
    </div>
  )
}
