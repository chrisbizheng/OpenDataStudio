import { describe, expect, it } from "vitest"
import { parseAiQuestions } from "../prompts/questions"

describe("parseAiQuestions", () => {
  it("从 LLM JSON 中提取最多 5 条有效问题", () => {
    const questions = parseAiQuestions(JSON.stringify({
      questions: [
        "按渠道分析销售额",
        { question: "查看销售额趋势" },
        "",
        { question: "找出异常订单" },
        "分析利润率",
        "生成数据画像",
        "第六条不应出现",
      ],
    }))

    expect(questions).toEqual([
      "按渠道分析销售额",
      "查看销售额趋势",
      "找出异常订单",
      "分析利润率",
      "生成数据画像",
    ])
  })
})
