import { SQLDialect } from "@codemirror/lang-sql";

export const ClickHouse = SQLDialect.define({
  identifierQuotes: "`",

  keywords:
    "SELECT FROM WHERE JOIN INNER LEFT RIGHT FULL CROSS ON USING GROUP BY ORDER BY LIMIT OFFSET " +
    "INSERT INTO VALUES UPDATE DELETE TRUNCATE CREATE TABLE DROP TABLE ALTER TABLE RENAME TABLE " +
    "AS WITH DISTINCT UNION ALL ANY DISTINCT IF EXISTS NOT EXISTS PRIMARY KEY ENGINE DATABASE " +
    "AND OR NOT IN BETWEEN LIKE ILIKE GLOBAL ARRAY JOIN ASOF LEFT ARRAY JOIN " +
    "PREWHERE HAVING TOP WITH TOTALS FORMAT SETTINGS " +
    "FUNCTION VIEW MATERIALIZED DATABASE TEMPORARY PARTITION BY SAMPLE " +
    "KILL QUERY OPTIMIZE TTL SYSTEM SHOW DESCRIBE EXISTS USE " +
    "TRUE FALSE NULL NULLABLE " +
    "CASE WHEN THEN ELSE END CAST ADD SUBTRACT MULTIPLY DIVIDE MODULO " +
    "TO FINAL",

  types:
    "Int8 Int16 Int32 Int64 UInt8 UInt16 UInt32 UInt64 Float32 Float64 Decimal " +
    "String FixedString UUID Date Date32 DateTime DateTime64 Enum Enum8 Enum16 " +
    "Array Tuple Nested Map IPv4 IPv6 SimpleAggregateFunction AggregateFunction " +
    "Nullable LowCardinality Point MultiPolygon Ring Polygon",

  builtin:
    "count sum avg min max argMax argMin groupArray arrayMap arrayFilter length " +
    "now today yesterday toDate toString toInt64 ifNull coalesce " +
    "database table _table _partition_id _part_name _sample_factor " +
    "JSONExtract JSONExtractString JSONExtractInt JSONExtractUInt JSONExtractFloat " +
    "JSONHas JSONLength JSONKeys JSONAllPaths " +
    "arrayJoin groupUniqArray uniq uniqExact uniqCombined topK quantile quantiles " +
    "variance stddevPop covarPop correlation any last anyLast " +
    "groupArrayInsertAt groupArrayMovingSum groupArrayMovingAvg " +
    "sumMap sumWithOverflow minMap maxMap " +
    "flatten arrayConcat arraySort arrayReverseSort arrayExists arrayAll arrayCompact " +
    "arrayDifference arrayDistinct arrayEnumerate arrayIntersect arrayMap arrayFilter " +
    "arrayFill arrayReverseFill arraySplit arrayStringConcat " +
    "formatReadableSize formatReadableQuantity formatReadableTimeDelta " +
    "toStartOfDay toStartOfHour toStartOfMonth toStartOfQuarter toStartOfYear " +
    "toMonday toRelativeDayNum toRelativeWeekNum toRelativeMonthNum toRelativeYearNum " +
    "dateDiff dateTrunc dateAdd dateSub " +
    "visitParamHas visitParamExtractUInt visitParamExtractInt visitParamExtractFloat visitParamExtractString visitParamExtractRaw",

  operatorChars: "*+-/%!=&|~^<>?",

  caseInsensitiveIdentifiers: true,
});
