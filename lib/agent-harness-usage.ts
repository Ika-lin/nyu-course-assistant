// 使用示例：对比两种模式

import { AgentHarness } from './agent-harness';

// ============ 模式1: Intent Planning（当前项目用的） ============
async function withIntentPlanning() {
  const agent = new AgentHarness({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    intentModel: 'deepseek-chat', // 用轻量模型先判断意图
  });

  // 注册工具
  agent.registerTool('get_student_profile', '获取学生档案', {
    student_id: { type: 'string' },
  }, async (params) => {
    // 实际实现
    return { student_id: params.student_id, major: 'CS', completed: ['CSCI-101'] };
  });

  agent.registerTool('check_prerequisites', '检查先修课', {
    course_code: { type: 'string' },
    completed_courses: { type: 'array' },
  }, async (params) => {
    return { satisfied: true };
  });

  // 执行
  const result = await agent.run('我能上 CSCI-473 吗？');

  // 流程：
  // 1. AI 判断意图 → "course_access"
  // 2. 根据意图决定调用 get_student_profile + check_prerequisites
  // 3. 执行工具
  // 4. 生成回复

  return result;
}

// ============ 模式2: Native Function Calling（让 AI 自己决定） ============
async function withNativeFunctionCalling() {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_student_profile',
        description: '获取学生档案',
        parameters: {
          type: 'object',
          properties: {
            student_id: { type: 'string' },
          },
          required: ['student_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_prerequisites',
        description: '检查先修课',
        parameters: {
          type: 'object',
          properties: {
            course_code: { type: 'string' },
            completed_courses: { type: 'array', items: { type: 'string' } },
          },
          required: ['course_code', 'completed_courses'],
        },
      },
    },
  ];

  // 直接调用 LLM，让它决定用什么工具
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是选课助手' },
        { role: 'user', content: '我能上 CSCI-473 吗？' },
      ],
      tools, // 把工具列表给 AI
    }),
  });

  const data = await response.json();
  const message = data.choices[0].message;

  // AI 自己决定调用哪些工具
  if (message.tool_calls) {
    // 执行 AI 选择的工具
    for (const toolCall of message.tool_calls) {
      const result = await executeToolLocally(toolCall.function.name, JSON.parse(toolCall.function.arguments));
      // 把结果返回给 AI
    }
  }

  // 流程：
  // 1. AI 直接看到所有工具
  // 2. AI 自己决定调用 get_student_profile + check_prerequisites
  // 3. 执行工具
  // 4. 把结果返回给 AI，AI 生成回复
}

// ============ 对比 ============
/*
模式1（Intent Planning）:
优点：
- 控制力强：你决定什么意图调用什么工具
- 成本低：intent 判断用轻量模型，不需要传所有工具定义
- 可预测：不会出现 AI 乱调工具的情况
- 适合复杂业务逻辑：比如"先查档案，再根据专业决定调用哪些工具"

缺点：
- 需要手写意图→工具的映射逻辑
- 不够灵活：新增工具需要更新意图判断
- 多一次 LLM 调用

模式2（Native Function Calling）:
优点：
- 简单：不需要写意图判断逻辑
- 灵活：AI 自己决定调用什么工具
- 标准：符合 OpenAI/Anthropic function calling 规范

缺点：
- 成本高：每次都要传所有工具定义（token 消耗大）
- 不可控：AI 可能调用不该调用的工具
- 需要模型支持 function calling（DeepSeek/GPT-4/Claude 支持）
*/

// ============ 当前项目为什么用模式1？ ============
/*
1. 工具太多（26个），每次传给 AI 会消耗大量 token
2. 业务逻辑复杂：
   - "我能上这门课吗" → 先查档案，再查先修课
   - "帮我排课表" → 先查档案，再查课程，再检查冲突，再生成课表
   这些逻辑用 intent planning 更好控制

3. 成本优化：intent 判断用轻量模型，只传必要的工具

4. 可预测性：不希望 AI 随便调用工具（比如不该修改档案时调用了修改工具）
*/

async function executeToolLocally(name: string, params: any) {
  // 实际工具执行逻辑
  return {};
}
