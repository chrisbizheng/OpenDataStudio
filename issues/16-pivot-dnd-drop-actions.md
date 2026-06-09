# 16 Pivot DnD DropAction

## 目标

用纯函数定义 Pivot 拖拽投放语义。

## 验收标准

- 维度字段可投放到筛选器、行维度、列维度
- 指标字段可投放到筛选器、指标
- 非法投放返回 null
- chip 拖出投放区表示移除
- 同区拖拽返回 reorder action
- 跨区拖拽返回 move-cross-zone action
