function escapeField(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``
}

export function buildDistinctFilterValuesSQL(
  database: string,
  table: string,
  field: string
): string {
  const f = escapeField(field)
  return [
    `SELECT DISTINCT ${f} AS \`value\``,
    `FROM ${escapeField(database)}.${escapeField(table)}`,
    `WHERE ${f} IS NOT NULL`,
    `ORDER BY ${f}`,
    "LIMIT 200",
  ].join("\n")
}

export function toggleFilterValue(values: unknown[], value: unknown): unknown[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}
