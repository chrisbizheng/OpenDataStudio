export type Lang = "zh" | "en"

const dict: Record<string, { zh: string; en: string }> = {
  // Header
  "app.title": { zh: "Open Data Studio", en: "Open Data Studio" },
  // Sidebar
  "sidebar.tables": { zh: "表", en: "Tables" },
  "sidebar.no_tables": { zh: "无表", en: "No tables found" },
  // Status bar
  "status.connected": { zh: "已连接", en: "Connected" },
  "status.connecting": { zh: "连接中...", en: "Connecting..." },
  "status.failed": { zh: "连接失败", en: "Connection failed" },
  "status.tables": { zh: "个表", en: "tables" },
  "status.rows_total": { zh: "行总计", en: "rows total" },
  // Tabs
  "tab.schema": { zh: "结构", en: "Schema" },
  "tab.sql": { zh: "SQL", en: "SQL" },
  "tab.agent": { zh: "智能", en: "Agent" },
  // Schema panel
  "schema.select_table": { zh: "选择表查看结构", en: "Select a table to view its schema" },
  "schema.data_source": { zh: "数据来源", en: "Data Source" },
  "schema.rows": { zh: "行", en: "rows" },
  "field.role.dimension": { zh: "维度", en: "Dimension" },
  "field.role.indicator": { zh: "指标", en: "Indicator" },
  "field.role.unmarkable": { zh: "不可标记", en: "Not markable" },
  "field.role.menu.set_dimension": { zh: "设为维度", en: "Set as Dimension" },
  "field.role.menu.set_indicator": { zh: "设为指标", en: "Set as Indicator" },
  "field.role.menu.reset": { zh: "重置默认", en: "Reset to default" },
  "field.role.drag": { zh: "拖拽字段", en: "Drag field" },
  "field.role.current": { zh: "当前", en: "Current" },
  "field.role.default": { zh: "默认", en: "Default" },
  "field.role.overridden": { zh: "已覆盖", en: "overridden" },
  "field.role.drop_invalid": { zh: "该字段不能放入此区", en: "This field cannot be dropped here" },
  // Data grid
  "grid.no_rows": { zh: "无返回行", en: "No rows returned" },
  "grid.load_more": { zh: "加载下 1,000 行", en: "Load next 1,000 rows" },
  "grid.loading": { zh: "加载中...", en: "Loading..." },
  "grid.rows": { zh: "行", en: "rows" },
  "grid.loaded": { zh: "已加载", en: "loaded" },
  "grid.window_search": { zh: "窗口搜索", en: "Window search" },
  "grid.window_sort": { zh: "窗口排序", en: "Window sort" },
  "grid.window_export": { zh: "导出已加载", en: "Export loaded" },
  // Search
  "search.placeholder": { zh: "跨列搜索...", en: "Search across columns..." },
  // SQL console
  "sql.run": { zh: "运行", en: "Run" },
  "sql.save": { zh: "保存", en: "Save" },
  "sql.placeholder": { zh: "-- 编写 SQL 查询...", en: "-- Write your SQL query here..." },
  "sql.insert_select": { zh: "SELECT * LIMIT 1000", en: "SELECT * LIMIT 1000" },
  // Query panels
  "panel.history": { zh: "历史", en: "History" },
  "panel.saved": { zh: "已存", en: "Saved" },
  "panel.community": { zh: "社区", en: "Community" },
  "panel.no_history": { zh: "暂无查询历史", en: "No query history yet" },
  "panel.no_saved": { zh: "暂无已存查询", en: "No saved queries yet" },
  "panel.clear": { zh: "清空", en: "Clear" },
  "panel.entries": { zh: "条记录", en: "entries" },
  "panel.saved_count": { zh: "已存", en: "saved" },
  "panel.templates": { zh: "个模板", en: "templates" },
  // Agent
  "agent.try_asking": { zh: "试试问：", en: "Try asking:" },
  "agent.placeholder": { zh: "提问数据问题...", en: "Ask a question about your data..." },
  "agent.send": { zh: "发送", en: "Send" },
  "agent.thinking": { zh: "思考中...", en: "Thinking..." },
  "agent.thinking_process": { zh: "分析过程", en: "Analysis" },
  "agent.waiting_llm": { zh: "等待 LLM 响应", en: "Waiting for LLM" },
  "agent.clear": { zh: "清空", en: "Clear" },
  "agent.clear_conversation": { zh: "清空当前表的对话历史", en: "Clear conversation for current table" },
  "agent.generate_profile": { zh: "📊 生成画像", en: "📊 Generate Profile" },
  "agent.not_configured": { zh: "⚠️ 未配置 LLM。请在设置中配置 API 密钥。", en: "⚠️ LLM not configured. Go to Settings and enter your API key." },
  "agent.welcome": { zh: "向我询问您的数据。试试\"显示销售额前 10 的区域\"或\"生成数据画像\"。", en: "Ask me anything about your data. Try \"Show me the top 10 regions by sales\" or \"Generate a data profile\"." },
  "agent.sql_label": { zh: "SQL", en: "SQL" },
  "agent.showing_rows": { zh: "显示 20 行，共", en: "Showing 20 of" },
  "agent.rows": { zh: "行", en: "rows" },
  // Settings
  "settings.title": { zh: "LLM 设置", en: "LLM Settings" },
  "settings.provider": { zh: "提供商", en: "Provider" },
  "settings.api_key": { zh: "API 密钥", en: "API Key" },
  "settings.base_url": { zh: "基础 URL", en: "Base URL" },
  "settings.model": { zh: "模型", en: "Model" },
  "settings.test": { zh: "测试连接", en: "Test Connection" },
  "settings.testing": { zh: "测试中...", en: "Testing..." },
  "settings.connected": { zh: "已连接！", en: "Connected!" },
  "settings.failed": { zh: "失败", en: "Failed" },
  "settings.cancel": { zh: "取消", en: "Cancel" },
  "settings.save": { zh: "保存", en: "Save" },
  "settings.api_key_placeholder": { zh: "sk-...", en: "sk-..." },
  "settings.api_key_ollama": { zh: "本地 Ollama 无需密钥", en: "Not required for local Ollama" },
  // Save query prompt
  "save_query.prompt": { zh: "命名此查询：", en: "Name this query:" },
  // Error boundary
  "error.title": { zh: "出现错误", en: "Something went wrong" },
  "error.reload": { zh: "重新加载", en: "Reload" },
  // Main
  "main.select_table": { zh: "从侧边栏选择表开始", en: "Select a table from the sidebar to get started" },
  "main.loading": { zh: "加载中", en: "Loading" },
  // Theme toggle
  "theme.title": { zh: "当前", en: "Current" },
  // Language
  "lang.switch": { zh: "EN", en: "中文" },
  // Pivot
  "tab.grid": { zh: "网格", en: "Grid" },
  "tab.pivot": { zh: "透视", en: "Pivot" },
  "pivot.filters": { zh: "筛选器", en: "Filters" },
  "pivot.rows": { zh: "行维度", en: "Row Dimensions" },
  "pivot.result_rows": { zh: "行", en: "rows" },
  "pivot.limited_prefix": { zh: "已限制前", en: "limited to first" },
  "pivot.large_warning": { zh: "结果较大，可能影响交互性能", en: "large result, interaction may be slower" },
  "pivot.columns": { zh: "列维度", en: "Column Dimensions" },
  "pivot.indicators": { zh: "指标", en: "Indicators" },
  "pivot.calculated": { zh: "计算指标", en: "Calculated Indicators" },
  "pivot.add_indicator": { zh: "添加指标", en: "Add Indicator" },
  "pivot.zone.empty": { zh: "拖入字段", en: "Drop fields here" },
  "pivot.filter.values": { zh: "选择值", en: "Select values" },
  "pivot.filter.range": { zh: "范围", en: "Range" },
  "pivot.filter.min": { zh: "最小值", en: "Min" },
  "pivot.filter.max": { zh: "最大值", en: "Max" },
  "pivot.add_calculated": { zh: "添加计算指标", en: "Add Calculated Indicator" },
  "pivot.execute": { zh: "执行", en: "Execute" },
  "pivot.view_sql": { zh: "查看 SQL", en: "View SQL" },
  "pivot.no_indicators": { zh: "请添加指标", en: "Please add indicators" },
  "pivot.no_dimensions": { zh: "请添加维度", en: "Please add dimensions" },
  "pivot.drilldown": { zh: "下钻明细", en: "Drill Down" },
  "pivot.history": { zh: "透视历史", en: "Pivot History" },
  "pivot.copy_sql": { zh: "复制 SQL", en: "Copy SQL" },
  "pivot.close": { zh: "关闭", en: "Close" },
  "pivot.expression": { zh: "表达式", en: "Expression" },
  "pivot.visual_mode": { zh: "可视化模式", en: "Visual Mode" },
  "pivot.text_mode": { zh: "文本模式", en: "Text Mode" },
  "pivot.format": { zh: "格式", en: "Format" },
  "pivot.decimals": { zh: "小数位", en: "Decimals" },
  "pivot.delete": { zh: "删除", en: "Delete" },
  "pivot.cancel": { zh: "取消", en: "Cancel" },
  "pivot.save": { zh: "保存", en: "Save" },
}

export function t(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? key
}

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "zh"
  return (localStorage.getItem("lang") as Lang) || "zh"
}

export function setStoredLang(lang: Lang) {
  localStorage.setItem("lang", lang)
}
