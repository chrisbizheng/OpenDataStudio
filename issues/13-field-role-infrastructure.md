# 13 字段角色基础设施

## 目标

为 schema 字段提供字段角色能力：默认角色按类型推断，用户角色覆盖持久化在本地。

## 验收标准

- String / Date / Bool / Enum 等字段默认是维度
- Int / UInt / Float / Decimal 等字段默认是指标
- Array 等不可标记类型不返回字段角色
- 用户角色覆盖优先于默认角色
- 覆盖以 database / table / column 粒度存储在 localStorage
- 重置后回退默认角色

## 验证

- `src/lib/__tests__/field-role.test.ts`
- `src/stores/__tests__/field-role.test.ts`
