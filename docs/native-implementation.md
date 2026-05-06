# 完全 AI-native 实现思路

## 核心流程（让 AI 自己决定一切）

```
用户消息
  ↓
AI 看到所有工具 → 自己决定调用哪些工具
  ↓
执行工具（并发）
  ↓
把结果返回给 AI → AI 决定：继续调用工具 or 生成回复
  ↓
循环直到 AI 不再调用工具
  ↓
返回最终回复
```

---

## 代码实现（200行 vs 原来的 600行）

### 1. 准备对话上下文
```typescript
const messages = [
  {
    role: 'system',
    content: '你是选课助手。规则：先查档案，再检查先修课...'
  },
  ...用户的对话历史
];
```

### 2. 进入 AI 自主决策循环
```typescript
while (maxIterations > 0) {
  // 调用 AI，传入所有工具定义
  const response = await chatCompletion(messages, TOOLS);
  
  // AI 返回两种可能：
  // 1. 直接回复（不调用工具）→ 结束循环
  // 2. 调用工具（tool_calls）→ 继续
}
```

### 3. AI 决定调用工具
```typescript
// AI 返回：
{
  tool_calls: [
    {
      id: 'call_1',
      function: {
        name: 'get_student_profile',
        arguments: '{"student_id": "yl8888"}'
      }
    },
    {
      id: 'call_2',
      function: {
        name: 'check_prerequisites',
        arguments: '{"course_code": "CSCI-473", ...}'
      }
    }
  ]
}
```

### 4. 执行工具（并发）
```typescript
const toolResults = await Promise.all(
  tool_calls.map(async (toolCall) => {
    const result = await callTool(toolCall.function.name, toolCall.function.arguments);
    
    // 返回给 AI 的格式
    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      name: toolCall.function.name,
      content: JSON.stringify(result)
    };
  })
);
```

### 5. 把结果返回给 AI
```typescript
messages.push(assistantMessage); // AI 的工具调用请求
messages.push(...toolResults);   // 工具执行结果

// 回到循环开始，AI 看到结果后决定：
// - 继续调用工具？
// - 还是生成最终回复？
```

---

## 关键区别

### 旧版（Intent Planning）
```typescript
// 你的代码决定流程
if (intent === 'course_access') {
  const profile = await getTool('get_student_profile');
  const prereq = await getTool('check_prerequisites', { 
    completed: profile.completed 
  });
  return generateResponse(prereq);
}
```
❌ 硬编码流程
❌ 工具调用顺序固定
❌ 参数传递需要手写

### 新版（Native Function Calling）
```typescript
// AI 自己决定
while (true) {
  const response = await AI.chat(messages, ALL_TOOLS);
  
  if (response.tool_calls) {
    // AI 决定调用什么工具、什么参数
    const results = await executeTools(response.tool_calls);
    messages.push(...results);
  } else {
    // AI 决定不再调用工具，返回回复
    return response.content;
  }
}
```
✅ AI 决定流程
✅ AI 决定工具调用顺序
✅ AI 决定参数传递

---

## 实际执行示例

### 用户："我能上 CSCI-473 吗？"

**第1轮：AI 决策**
```
AI: 我需要先查学生档案
→ tool_calls: [get_student_profile(student_id: yl8888)]
```

**执行工具 → 返回结果**
```
tool_result: { major: 'CS', completed: ['CSCI-101', 'CSCI-102'] }
```

**第2轮：AI 看到结果，继续决策**
```
AI: 现在我知道学生已修课了，检查先修课
→ tool_calls: [check_prerequisites(course: CSCI-473, completed: [...])]
```

**执行工具 → 返回结果**
```
tool_result: { satisfied: true, missing: [] }
```

**第3轮：AI 看到结果，决定不再调用工具**
```
AI: 根据你的档案，你已经完成了 CSCI-473 的先修课（CSCI-101, CSCI-102），可以选这门课。
→ 返回最终回复
```

---

## 优势

1. **代码简洁**：200行 vs 600行
2. **无硬编码**：不需要写 if-else 判断意图
3. **AI 自主**：AI 自己决定调用顺序和参数
4. **灵活**：新增工具只需要注册，不需要改代码

## 代价

1. **成本高**：每次都传所有工具定义（26个工具 ≈ 2000 tokens）
2. **不可控**：AI 可能调用不该调用的工具
3. **需要强模型**：DeepSeek/GPT-4/Claude 才支持 function calling

---

## 如何使用

```bash
# 1. 备份旧版
mv app/api/chat/route.ts app/api/chat/route-old.ts

# 2. 使用新版
mv app/api/chat/route-native.ts app/api/chat/route.ts

# 3. 重启服务
npm run dev
```

测试：
- "我能上 CSCI-473 吗？" → AI 自己决定调用 get_profile + check_prereq
- "帮我排课表" → AI 自己决定调用 get_profile + get_requirements + generate_schedule
- "有什么 AI 课程" → AI 自己决定调用 search_courses

---

## 安全控制

虽然让 AI 自己决定，但你可以通过 system prompt 约束：

```typescript
system: `
规则：
1. 查询课程前，必须先获取学生档案
2. 不要随意调用修改类工具
3. 每次最多调用3个工具
4. 如果工具返回错误，不要重试超过2次
`
```

这样既保持 AI-native，又有基本的安全边界。
