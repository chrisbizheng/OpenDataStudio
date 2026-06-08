import { SQLDialect } from "@codemirror/lang-sql";

export const ClickHouse = SQLDialect.define({
  identifierQuotes: "`",

  keywords:
    "select from where join inner left right full cross on using group by order by limit offset " +
    "insert into values update delete truncate create table drop table alter table rename table " +
    "as with distinct union all any distinct if exists not exists primary key engine database " +
    "and or not in between like ilike global array join asof left array join " +
    "prewhere having top with totals format settings " +
    "function view materialized database temporary partition by sample " +
    "kill query optimize ttl system show describe exists use " +
    "true false null nullable " +
    "case when then else end cast add subtract multiply divide modulo " +
    "to final",

  types:
    "int8 int16 int32 int64 uint8 uint16 uint32 uint64 float32 float64 decimal " +
    "string fixed_string uuid date date32 datetime datetime64 enum enum8 enum16 " +
    "array tuple nested map ipv4 ipv6 simpleaggregatefunction aggregatefunction " +
    "nullable lowcardinality point multipolygon ring polygon",

  builtin:
    "count sum avg min max argmax argmin grouparray arraymap arrayfilter length " +
    "now today yesterday todate tostring toint64 ifnull coalesce " +
    "database table _table _partition_id _part_name _sample_factor " +
    "jsonextract jsonextractstring jsonextractint jsonextractuint jsonextractfloat " +
    "jsonhas jsonlength jsonkeys jsonallpaths " +
    "arrayjoin groupuniqarray uniq uniqexact uniqcombined topk quantile quantiles " +
    "variance stddevpop covarpop correlation any last anylast " +
    "grouparrayinsertat grouparraymovingsum grouparraymovingavg " +
    "summap sumwithoverflow minmap maxmap " +
    "flatten arrayconcat arraysort arrayreversesort arrayexists arrayall arraycompact " +
    "arraydifference arraydistinct arrayenumerate arrayintersect arraymap arrayfilter " +
    "arrayfill arrayreversefill arraysplit arraystringconcat " +
    "formatreadablesize formatreadablequantity formatreadabletimedelta " +
    "tostartofday tostartofhour tostartofmonth tostartofquarter tostartofyear " +
    "tomonday torelativedaynum torelativeweeknum torelativemonthnum torelativeyearnum " +
    "datediff datetrunc dateadd datesub " +
    "visitparamhas visitparamextractuint visitparamextractint visitparamextractfloat visitparamextractstring visitparamextractraw",

  operatorChars: "*+-/%!=&|~^<>?",

  caseInsensitiveIdentifiers: true,
});
