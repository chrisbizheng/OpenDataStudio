# 15 Pivot 筛选器与 BETWEEN

## 目标

为 Pivot 增加筛选器配置，并支持范围条件。

## 验收标准

- `FilterRule` 支持 `BETWEEN`
- `generatePivotSQL` 生成 `field BETWEEN from AND to`
- 筛选器区展示 filter chip
- 维度筛选使用 IN 值列表
- 指标和日期筛选使用 BETWEEN 范围
- 多个筛选条件以 AND 组合
