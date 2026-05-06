# 问题：生成课表超时

## 问题截图
用户输入：`我下学期去纽约study away 给我生成对应的课表`
AI 回复：抱歉，处理过程超时。请简化你的问题重试。

## 原因分析

### 1. 迭代次数限制太低
```typescript
let maxIterations = 10; // 原来只有10次
```

生成课表是复杂任务，AI 可能需要：
1. 获取学生档案
2. 获取专业要求
3. 生成课表
4. 可能还要查询课程详情、检查先修课等

10次迭代不够。

### 2. AI 不知道应该直接调用综合工具
AI 可能会：
- 先调用 `get_student_profile`
- 再调用 `get_major_requirements`
- 再调用 `search_courses`
- 再调用 `check_prerequisites`
- ...（多次基础工具调用）

而不是直接调用 `generate_personalized_schedule`（一次搞定）。

---

## 解决方案

### 1. 增加迭代次数限制
```typescript
let maxIterations = 20; // 增加到20次，支持复杂任务
```

### 2. 优化 System Prompt，引导 AI 使用综合工具
```typescript
高效工具使用：
- "帮我排课表" / "生成课表" → 直接调用 generate_personalized_schedule(student_id: yl8888, term: Fall 2026)
  不要手动调用多个工具拼凑，这个工具会自动处理所有逻辑
- "我能上X课吗" → 调用 evaluate_course_access_with_plan，不要分步调用多个工具
- 优先使用综合性工具，避免多次调用基础工具
```

---

## 测试结果

### 输入：`帮我生成下学期的课表`

**AI 自主决策流程**：
```
1. 调用 get_student_profile(student_id: yl8888)
2. 调用 get_major_requirements(major: Data Science)
3. 调用 generate_personalized_schedule(student_id: yl8888, term: Fall 2026)
   ✅ 成功返回完整课表
4. AI 生成回复
```

**返回结果**：
```json
{
  "schedule_result": {
    "schedule": [
      {
        "course_code": "PHIL-UA 5",
        "title": "Minds and Machines",
        "credits": 4,
        "selected_section": {
          "days": ["M", "W"],
          "start": "16:00",
          "end": "17:15",
          "format": "Online"
        }
      },
      {
        "course_code": "CSCI-SHU 213",
        "title": "Databases",
        "credits": 4,
        "selected_section": {
          "days": ["T", "R"],
          "start": "09:30",
          "end": "10:45",
          "format": "Hybrid"
        }
      },
      // ... 更多课程
    ],
    "total_credits": 16,
    "deferred_courses": [...],
    "future_plan": [...]
  }
}
```

**工具调用次数**：3次（远低于20次限制）

---

## AI-native 的挑战

### 问题：AI 可能不知道最优工具选择

**场景1：低效的工具调用**
```
AI 决策：
1. get_student_profile
2. get_course_info("CSCI-UA 473")
3. check_prerequisites("CSCI-UA 473", [...])
4. get_course_schedule("CSCI-UA 473")
5. check_course_availability("CSCI-UA 473")
6. ... 10次工具调用
```

**场景2：高效的工具调用**
```
AI 决策：
1. evaluate_course_access_with_plan("CSCI-UA 473", "yl8888")
   ✅ 一次搞定所有检查
```

### 解决方案：通过 System Prompt 引导

**不是硬编码逻辑，而是给 AI 提供"最佳实践"**

```typescript
system: `
高效工具使用：
- 优先使用综合性工具（generate_personalized_schedule, evaluate_course_access_with_plan）
- 避免多次调用基础工具拼凑结果
`
```

这仍然是 AI-native：
- ✅ AI 自己决定是否遵循建议
- ✅ AI 可以根据具体情况调整
- ✅ 不是硬编码的 if-else

---

## 总结

### 修改内容
1. ✅ `maxIterations: 10 → 20`
2. ✅ 添加"高效工具使用"指南到 system prompt

### 效果
- ✅ 生成课表成功（3次工具调用）
- ✅ 返回完整的 `schedule_result`
- ✅ 前端课表同步正常

### AI-native 的平衡
- **给 AI 自由**：让它自己决定调用什么工具
- **给 AI 指导**：告诉它最佳实践，避免低效路径
- **不是硬编码**：AI 仍然可以根据情况调整

这就是 AI-native 的艺术：**引导而不是控制**。
