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

const SYSTEM_PROMPT = `You are an AI course advisor for NYU Shanghai students.

Use tools efficiently. Most tasks should complete in 3-5 tool calls.

Key tools:
- generate_personalized_schedule: generates full schedule (includes profile check, requirement check, conflict resolution)
- detect_minor_opportunities: finds minor opportunities from completed courses
- estimate_workload: calculates total workload
- get_community_reviews: gets student reviews

For "生成课表" requests:
1. generate_personalized_schedule (campus="New York" if Study Away)
2. If schedule looks incomplete: detect_minor_opportunities
3. estimate_workload
4. Done

For simple queries:
- "这门课怎么样" → get_community_reviews
- "我能选吗" → check_prerequisites
- "有什么课" → search_courses

Default context:
- student_id: yl8888
- term: Fall 2026
- Study Away to New York

Respond in 简体中文. Be direct. Highlight risks with ⚠️.`;

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

  const conversationMessages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  const toolTrace: Array<{
    iteration: number;
    thinking: string;
    tool: string;
    status: string;
    args?: any;
    result?: any;
    timestamp: string;
  }> = [];
  let currentMessages = conversationMessages;
  let maxIterations = 20;
  let iterationCount = 0;

  let scheduleResult: any = null;
  let courseAccessResult: any = null;

  // Early stop: if AI generates schedule + workload, that's enough
  let hasSchedule = false;
  let hasWorkload = false;

  while (maxIterations > 0) {
    maxIterations--;
    iterationCount++;

    const response = await chatCompletion(currentMessages, TOOLS);
    const assistantMessage = response.choices[0].message;

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const result: any = {
        tool_trace: toolTrace,
        total_iterations: iterationCount,
        choices: [{
          message: {
            role: 'assistant',
            content: assistantMessage.content || '抱歉，我无法生成回复。',
          },
        }],
      };

      if (scheduleResult) result.schedule_result = scheduleResult;
      if (courseAccessResult) result.course_access_result = courseAccessResult;

      return NextResponse.json(result);
    }

    currentMessages.push(assistantMessage);

    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall: ToolCall) => {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Generate AI thinking description
        const thinkingMap: Record<string, string> = {
          'get_student_profile': '💭 我需要先了解这个学生的背景（专业、已修课、GPA）',
          'get_major_requirements': '💭 我需要检查专业毕业要求',
          'find_study_away_restrictions': '💭 我需要查询Study Away的选课限制',
          'generate_personalized_schedule': '💭 现在可以生成个性化课表了',
          'estimate_workload': '💭 我应该评估一下这个课表的工作量会不会太大',
          'get_course_history': '💭 我需要查询历史数据，看看这门课的座位竞争情况',
          'suggest_backup_courses': '💭 座位风险很高，我应该推荐备选方案',
          'get_community_reviews': '💭 我应该查看学长学姐的真实评价',
          'check_prerequisites': '💭 我需要验证先修课是否满足',
          'compare_courses': '💭 我应该对比这几门课的难度和工作量',
        };

        const thinking = thinkingMap[toolName] || `💭 调用工具：${toolName}`;

        toolTrace.push({
          iteration: iterationCount,
          thinking,
          tool: toolName,
          status: 'called',
          args: toolArgs,
          timestamp: new Date().toISOString(),
        });

        try {
          const result = await callTool(request.url, toolName, toolArgs);

          toolTrace.push({
            iteration: iterationCount,
            thinking: '📊 工具执行完成',
            tool: toolName,
            status: result?.error ? 'failed' : 'completed',
            result: result?.error ? { error: result.error } : result,
            timestamp: new Date().toISOString(),
          });

          if (toolName === 'generate_personalized_schedule' && result?.schedule) {
            scheduleResult = result;
            hasSchedule = true;
          }
          if (toolName === 'replace_schedule_course' && result?.schedule) {
            scheduleResult = result;
          }
          if (toolName === 'evaluate_course_access_with_plan' && result) {
            courseAccessResult = result;
          }
          if (toolName === 'estimate_workload' && result) {
            hasWorkload = true;
          }

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: toolName,
            content: JSON.stringify(result),
          };
        } catch (error: any) {
          toolTrace.push({
            iteration: iterationCount,
            thinking: '❌ 工具执行失败',
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

    currentMessages.push(...toolResults);

    // Early stop: if we have schedule + workload, encourage AI to finish
    if (hasSchedule && hasWorkload && iterationCount >= 3) {
      currentMessages.push({
        role: 'system',
        content: 'You have generated schedule and checked workload. You have enough information. Generate final response now.',
      });
    }
  }

  const result: any = {
    tool_trace: toolTrace,
    choices: [{
      message: {
        role: 'assistant',
        content: '抱歉，处理过程超时。请简化你的问题重试。',
      },
    }],
  };

  if (scheduleResult) result.schedule_result = scheduleResult;
  if (courseAccessResult) result.course_access_result = courseAccessResult;

  return NextResponse.json(result);
}
