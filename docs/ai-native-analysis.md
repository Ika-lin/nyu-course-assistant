# AI Native 架构分析：Intent Planning vs Native Function Calling

## 核心问题：让 AI 判断意图，符不符合 AI-native？

**答案：符合，但不是最 AI-native 的方式。**

---

## 什么是 AI-native？

AI-native 的核心特征：
1. **AI 是决策者**，不是执行者
2. **最小化硬编码规则**，让 AI 自主判断
3. **数据驱动**，不是规则驱动
4. **AI 能自主组合工具**，不是按预设流程执行

---

## 三种架构对比

### Level 0: 规则驱动（非 AI-native）
```typescript
// 硬编码规则
if (message.includes('能上') && message.includes('CSCI')) {
  // 固定流程
  const profile = await getProfile();
  const prereq = await checkPrereq();
  return generateResponse();
}
```
❌ **完全不是 AI-native**
- AI 只是文本生成器
- 所有逻辑都是硬编码
- 无法处理新场景

---

### Level 1: Intent Planning（当前项目）
```typescript
// AI 判断意图
const intent = await AI.classify(message); // → "course_access"

// 你的代码决定执行流程
if (intent === 'course_access') {
  const profile = await getProfile();
  const prereq = await checkPrereq(profile);
  return await AI.narrate(prereq);
}
```
✅ **部分 AI-native**
- AI 负责理解用户意图（决策层）
- 但工具调用逻辑是硬编码（执行层）
- AI 不能自主组合工具

**优点：**
- 比纯规则驱动更智能
- 可控、可预测
- 成本低

**缺点：**
- 工具调用逻辑是死的
- 新增工具需要改代码
- AI 的能力被限制了

---

### Level 2: Native Function Calling（完全 AI-native）
```typescript
// AI 自己决定调用什么工具
const response = await AI.chat({
  message: '我能上 CSCI-473 吗？',
  tools: [
    'get_student_profile',
    'check_prerequisites',
    'evaluate_course_access',
    'search_courses',
    'get_course_schedule',
    // ... 所有26个工具
  ]
});

// AI 自己决定：
// 1. 先调用 get_student_profile
// 2. 再调用 check_prerequisites
// 3. 最后调用 evaluate_course_access
// 4. 生成回复
```
✅✅ **完全 AI-native**
- AI 自主决策整个流程
- AI 自主组合工具
- 无硬编码规则

**优点：**
- 最灵活
- 新增工具无需改代码
- AI 能处理意想不到的场景

**缺点：**
- 成本高（每次传所有工具定义）
- 不可控（AI 可能乱调工具）
- 需要强大的模型（GPT-4/Claude Opus）

---

## 真实世界的 AI-native 产品怎么做？

### Cursor / GitHub Copilot Workspace
```
用户: "重构这个函数"
AI: 自己决定
  1. 读取文件
  2. 分析代码
  3. 生成重构方案
  4. 写入文件
  5. 运行测试
```
→ **Level 2: Native Function Calling**

### Devin (AI Software Engineer)
```
用户: "修复这个 bug"
AI: 自己决定
  1. 读取 issue
  2. 搜索相关代码
  3. 运行测试复现
  4. 修改代码
  5. 提交 PR
```
→ **Level 2: Native Function Calling**

### Perplexity / ChatGPT with browsing
```
用户: "最新的 AI 新闻"
AI: 自己决定
  1. 搜索网页
  2. 读取内容
  3. 总结
```
→ **Level 2: Native Function Calling**

---

## 当前项目的定位

**你的项目是 Level 1.5**

```typescript
// Level 1: Intent Planning
const intent = await AI.classify(message);

// Level 1.5: 有一些 AI 自主决策
if (intent === 'course_access') {
  // 但这里还是硬编码流程
  const profile = await getProfile();
  const prereq = await checkPrereq(profile);
}

// Level 2: 如果改成这样
const response = await AI.chat({
  message,
  tools: ALL_TOOLS,
  // AI 自己决定调用顺序
});
```

---

## 如何让你的项目更 AI-native？

### 方案1: 混合模式（推荐）
```typescript
// 简单意图：让 AI 自己决定
if (intent === 'general_chat' || intent === 'course_search') {
  return await AI.chat({ message, tools: SIMPLE_TOOLS });
}

// 复杂意图：保持 Intent Planning
if (intent === 'course_access') {
  // 但这里可以让 AI 决定工具调用顺序
  const plan = await AI.planToolSequence({
    intent: 'course_access',
    availableTools: ['get_profile', 'check_prereq', 'evaluate_access'],
  });
  
  // 执行 AI 生成的计划
  for (const step of plan) {
    await executeTool(step.tool, step.params);
  }
}
```

### 方案2: 完全 Native Function Calling
```typescript
// 把所有工具给 AI，让它自己决定
const response = await AI.chat({
  message,
  tools: ALL_26_TOOLS,
  systemPrompt: `
    你是选课助手。
    规则：
    1. 查询课程信息前，先获取学生档案
    2. 检查先修课时，必须用学生的已修课列表
    3. 不要随意修改学生档案
  `,
});
```

### 方案3: AI Planning + AI Execution（最 AI-native）
```typescript
// Step 1: AI 生成执行计划
const plan = await AI.plan({
  message: '我能上 CSCI-473 吗？',
  tools: ALL_TOOLS,
  // AI 返回：
  // [
  //   { tool: 'get_student_profile', params: { student_id: 'yl8888' } },
  //   { tool: 'check_prerequisites', params: { course: 'CSCI-473', completed: '{{step1.completed}}' } },
  //   { tool: 'evaluate_course_access', params: { ... } }
  // ]
});

// Step 2: 执行计划
const results = await executePlan(plan);

// Step 3: AI 生成回复
const response = await AI.narrate({ plan, results });
```

---

## 结论

### 当前项目（Intent Planning）
- ✅ 比传统规则驱动更智能
- ✅ 成本低、可控
- ⚠️ 但不是最 AI-native 的方式
- ⚠️ AI 的能力被限制了

### 最 AI-native 的方式
- ✅ Native Function Calling
- ✅ AI 自主决策整个流程
- ✅ 无硬编码规则
- ⚠️ 但成本高、不可控

### 我的建议
**你的项目已经很 AI-native 了（Level 1.5）**

如果要更进一步：
1. **短期**：保持 Intent Planning，但让 AI 决定工具调用顺序
2. **中期**：简单意图用 Native Function Calling，复杂意图用 Intent Planning
3. **长期**：完全 Native Function Calling + 强约束（system prompt + 工具权限控制）

---

## 类比：自动驾驶

| Level | 模式 | 类比 |
|-------|------|------|
| 0 | 规则驱动 | 定速巡航（只能保持速度） |
| 1 | Intent Planning | L2 辅助驾驶（你决定去哪，AI 帮你开） |
| 2 | Native Function Calling | L4 自动驾驶（AI 自己决定路线和操作） |

**你的项目是 L2，已经很不错了。**
**要不要升级到 L4，取决于你的需求和成本。**
