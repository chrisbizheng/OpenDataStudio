# 17 dnd-kit 接入 Pivot 面板

## 目标

从 Sidebar schema 字段拖拽到 Pivot 四个投放区。

## 验收标准

- `DndContext` 覆盖 Sidebar 和 Pivot 面板
- schema 字段可拖拽
- 筛选器、行维度、列维度投放区可接收字段
- DragOverlay 显示拖拽字段
- 投放后只更新配置，不自动执行查询
