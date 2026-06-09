import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createFieldRoleKey, type FieldRole } from "../lib/field-role"

interface FieldRoleState {
  overrides: Record<string, FieldRole>
  getOverride: (database: string, table: string, column: string) => FieldRole | undefined
  setOverride: (database: string, table: string, column: string, role: FieldRole) => void
  clearOverride: (database: string, table: string, column: string) => void
}

export const useFieldRoleStore = create<FieldRoleState>()(
  persist(
    (set, get) => ({
      overrides: {},
      getOverride: (database, table, column) =>
        get().overrides[createFieldRoleKey(database, table, column)],
      setOverride: (database, table, column, role) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [createFieldRoleKey(database, table, column)]: role,
          },
        })),
      clearOverride: (database, table, column) =>
        set((state) => {
          const key = createFieldRoleKey(database, table, column)
          const overrides = { ...state.overrides }
          delete overrides[key]
          return { overrides }
        }),
    }),
    {
      name: "field-role-store",
      partialize: (state) => ({ overrides: state.overrides }),
    }
  )
)
