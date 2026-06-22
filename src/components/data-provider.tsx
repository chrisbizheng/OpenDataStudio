"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { CatalogImpl, type Catalog } from "@/lib/catalog"
import { HttpCatalogPort } from "@/lib/catalog-port-http"
import { QueryEngineImpl, type QueryEngine } from "@/lib/query-engine"
import { QueryLifecycle } from "@/lib/query-lifecycle"

interface DataContextValue {
  catalog: Catalog
  queryEngine: QueryEngine
  queryLifecycle: QueryLifecycle
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DataContextValue>(() => {
    const catalog = new CatalogImpl(new HttpCatalogPort())
    const queryEngine = new QueryEngineImpl()
    const queryLifecycle = new QueryLifecycle({
      executeSql: (sql, database, signal) => queryEngine.execute(sql, database, signal),
    })
    return { catalog, queryEngine, queryLifecycle }
  }, [])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
