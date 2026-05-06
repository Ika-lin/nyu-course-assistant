import { NextResponse } from 'next/server';
import { TOOLS } from './tools';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

function modelConfig() {
  return {
    url: `${(process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, '')}/chat/completions`,
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  };
}

async function callTool(requestUrl: string, tool: string, params: Record<string, any>) {
  const url = new URL('/api/tools', requestUrl);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });

  if (!response.ok) {
    return { error: `Tool ${tool} failed with status ${response.status}` };
  }

  return response.json();
}

async function chatCompletion(messages: Message[], tools?: any[]) {
  const config = modelConfig();
  const body: any = {
    model: config.model,
    messages,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const { messages } = await request.json();
  const config = modelConfig();

  if (!config.apiKey) {
    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: '后端没有配置 DeepSeek API Key，请配置 DEEPSEEK_API_KEY。',
        },
      }],
    });
  }

  // 构建对话历史
  const conversationMessages: Message[] = [
    {
      role: 'system',
      content: `你是 NYU Shanghai 的选课助手。

核心规则：
1. 查询课程信息前，先获取学生档案（student_id: yl8888）
2. 检查先修课时，必须使用学生档案中的已修课列表
3. 生成课表时，必须先获取学生档案和专业要求
4. 回答用简体中文，简洁专业
5. 课程代码格式纠错：
   - 上海课程：CSCI-SHU（不是 SCI-SHU）、MATH-SHU、PHYS-SHU 等
   - 纽约课程：CSCI-UA、MATH-UA 等
   - 如果用户输入 "SCI-SHU 213"，自动纠正为 "CSCI-SHU 213"
   - 如果工具返回找不到课程，尝试用 search_courses 搜索相似课程

高效工具使用：
- "帮我排课表" / "生成课表" → 直接调用 generate_personalized_schedule(student_id: yl8888, term: Fall 2026)
  不要手动调用多个工具拼凑，这个工具会自动处理所有逻辑
- "我能上X课吗" → 调用 evaluate_course_access_with_plan，不要分步调用多个工具
- 优先使用综合性工具，避免多次调用基础工具

可用工具：
- get_student_profile: 获取学生档案（专业、已修课）
- get_course_info: 查询课程详细信息
- search_courses: 搜索课程
- check_prerequisites: 检查先修课是否满足
- can_take_course: 综合判断能否选课
- get_course_schedule: 查询课程时间表
- check_course_availability: 检查课程座位
- find_requirement_courses: 查找满足特定要求的课程
- get_major_requirements: 获取专业要求
- get_study_away_rules: 获取 Study Away 规则
- generate_personalized_schedule: 生成个性化课表
- evaluate_course_access_with_plan: 评估课程可行性并生成学习路径

工作流程建议：
- "我能上X课吗" → get_student_profile → check_prerequisites → can_take_course
- "帮我排课表" → get_student_profile → get_major_requirements → generate_personalized_schedule
- "有什么X类课程" → find_requirement_courses 或 search_courses`,
    },
    ...messages,
  ];

  const toolTrace: Array<{ tool: string; status: string; args?: any; result?: any }> = [];
  let currentMessages = conversationMessages;
  let maxIterations = 20; // 增加到20次，支持复杂任务（如生成课表）

  // 用于前端的特殊结果
  let scheduleResult: any = null;
  let courseAccessResult: any = null;

  // AI 自主决策循环
  while (maxIterations > 0) {
    maxIterations--;

    // 调用 AI，让它决定下一步
    const response = await chatCompletion(currentMessages, TOOLS);
    const assistantMessage = response.choices[0].message;

    // 如果 AI 不需要调用工具，直接返回回复
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const result: any = {
        tool_trace: toolTrace,
        choices: [{
          message: {
            role: 'assistant',
            content: assistantMessage.content || '抱歉，我无法生成回复。',
          },
        }],
      };

      // 添加前端需要的结果
      if (scheduleResult) result.schedule_result = scheduleResult;
      if (courseAccessResult) result.course_access_result = courseAccessResult;

      return NextResponse.json(result);
    }

    // AI 决定调用工具
    currentMessages.push(assistantMessage);

    // 执行 AI 选择的所有工具（并发）
    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall: ToolCall) => {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        toolTrace.push({
          tool: toolName,
          status: 'called',
          args: toolArgs,
        });

        try {
          const result = await callTool(request.url, toolName, toolArgs);

          toolTrace.push({
            tool: toolName,
            status: result?.error ? 'failed' : 'completed',
            result: result?.error ? { error: result.error } : result,
          });

          // 捕获前端需要的特殊结果
          if (toolName === 'generate_personalized_schedule' && result?.schedule) {
            scheduleResult = result;
          }
          if (toolName === 'replace_schedule_course' && result?.schedule) {
            scheduleResult = result;
          }
          if (toolName === 'evaluate_course_access_with_plan' && result) {
            courseAccessResult = result;
          }

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: toolName,
            content: JSON.stringify(result),
          };
        } catch (error: any) {
          toolTrace.push({
            tool: toolName,
            status: 'failed',
            result: { error: error.message },
          });

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: toolName,
            content: JSON.stringify({ error: error.message }),
          };
        }
      })
    );

    // 把工具结果返回给 AI
    currentMessages.push(...toolResults);
  }

  // 如果达到最大迭代次数
  const result: any = {
    tool_trace: toolTrace,
    choices: [{
      message: {
        role: 'assistant',
        content: '抱歉，处理过程超时。请简化你的问题重试。',
      },
    }],
  };

  // 添加前端需要的结果
  if (scheduleResult) result.schedule_result = scheduleResult;
  if (courseAccessResult) result.course_access_result = courseAccessResult;

  return NextResponse.json(result);
}
