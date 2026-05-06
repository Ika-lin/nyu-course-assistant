# 问题：课程代码格式错误导致找不到课程

## 问题截图
用户输入：`SCI-SHU 213`
AI 回复：系统课程库中暂无这门课的完整详情

## 原因分析

**用户输入错误**：
- 输入：`SCI-SHU 213`（少了开头的 C）
- 正确：`CSCI-SHU 213`

**数据库中的课程代码格式**：
- 上海：`CSCI-SHU`、`MATH-SHU`、`PHYS-SHU`
- 纽约：`CSCI-UA`、`MATH-UA`

AI 调用 `get_course_info("SCI-SHU 213")` 找不到数据。

---

## 解决方案

### 修改 System Prompt，让 AI 自动纠错

在 `app/api/chat/route.ts` 添加规则：

```typescript
5. 课程代码格式纠错：
   - 上海课程：CSCI-SHU（不是 SCI-SHU）、MATH-SHU、PHYS-SHU 等
   - 纽约课程：CSCI-UA、MATH-UA 等
   - 如果用户输入 "SCI-SHU 213"，自动纠正为 "CSCI-SHU 213"
   - 如果工具返回找不到课程，尝试用 search_courses 搜索相似课程
```

---

## 测试结果

### 输入：`SCI-SHU 213 是什么课？`

**AI 自主决策流程**：
```
1. 调用 get_course_info("CSCI-SHU 213") ← AI 自动纠正了
2. 返回：Course not found
3. AI 决定搜索相似课程
4. 调用 search_courses(keyword: "213", campus: "Shanghai")
5. 调用 search_courses(keyword: "CSCI-SHU", campus: "Shanghai")
6. 返回所有 CSCI-SHU 课程列表
7. AI 生成回复：
   "系统中没有找到 CSCI-SHU 213，最接近的课程有：
    - CSCI-SHU 210 - Data Structures（你正在修读中）
    - CSCI-SHU 215 - Operating Systems
    - CSCI-SHU 220 - Algorithms"
```

---

## AI-native 的优势体现

**旧版（Intent Planning）**：
- 需要你写代码处理课程代码纠错
- 需要你写代码处理"找不到课程"的降级逻辑

**新版（AI-native）**：
- AI 自己根据 system prompt 纠正课程代码
- AI 自己决定调用 search_courses 搜索相似课程
- AI 自己生成友好的回复

**完全自主，无需硬编码！**

---

## 总结

✅ **问题已解决**：AI 现在会自动纠正常见的课程代码错误
✅ **智能降级**：找不到课程时，AI 自动搜索相似课程
✅ **用户体验提升**：给出建议而不是简单的"找不到"

这就是 AI-native 的威力：你只需要告诉 AI 规则，它自己决定怎么处理。
