export function getVTableTheme(mode: string | undefined) {
  const isDark = mode === "dark"

  return {
    bodyStyle: {
      bgColor: isDark ? "#0a0a0a" : "#ffffff",
      color: isDark ? "#e4e4e7" : "#18181b",
      fontSize: 10,
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
      borderColor: isDark ? "#27272a80" : "#e4e4e780",
      padding: [1, 3, 1, 3],
    },
    headerStyle: {
      bgColor: isDark ? "#18181b" : "#f4f4f5",
      color: isDark ? "#e4e4e7" : "#18181b",
      fontSize: 10,
      fontWeight: "bold" as const,
      borderColor: isDark ? "#27272a80" : "#e4e4e780",
      padding: [1, 3, 1, 3],
    },
    rowHeaderStyle: {
      bgColor: isDark ? "#18181b" : "#f4f4f5",
      color: isDark ? "#e4e4e7" : "#18181b",
      fontSize: 10,
      borderColor: isDark ? "#27272a80" : "#e4e4e780",
      padding: [1, 3, 1, 3],
    },
    cornerHeaderStyle: {
      bgColor: isDark ? "#18181b" : "#f4f4f5",
      color: isDark ? "#a1a1aa" : "#71717a",
      fontSize: 9,
      borderColor: isDark ? "#27272a80" : "#e4e4e780",
      padding: [1, 3, 1, 3],
    },
    selectionStyle: {
      cellBgColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)",
      cellBorderColor: isDark ? "#3b82f6" : "#2563eb",
      cellBorderLineWidth: 1,
    },
    frameStyle: {
      borderColor: isDark ? "#27272a60" : "#e4e4e760",
      borderLineWidth: 0.5,
    },
    frozenColumnStyle: {
      bgColor: isDark ? "#141414" : "#fafafa",
    },
    scrollStyle: {
      visible: "always" as const,
      barTheme: isDark ? "dark" : "light",
    },
  }
}
