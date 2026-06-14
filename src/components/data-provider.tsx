"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { CatalogImpl, type Catalog } from "@/lib/catalog"
import { HttpCatalogPort } from "@/lib/catalog-port-http"
import { QueryEngineImpl, type QueryEngine } from "@/lib/query-engine"
import { HttpQueryPort } from "@/lib/query-port-http"

interface DataContextValue {
  catalog: Catalog
  queryEngine: QueryEngine
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DataContextValue>(() => {
    const catalog = new CatalogImpl(new HttpCatalogPort())
    const queryEngine = new QueryEngineImpl(new HttpQueryPort())
    return { catalog, queryEngine }
  }, [])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
