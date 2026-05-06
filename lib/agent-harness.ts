// AI Agent Harness - 优化版框架

type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
};

type Intent = {
  name: string;
  confidence: number;
  params: Record<string, any>;
};

type ToolCall = {
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  args?: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
};

type AgentConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  intentModel?: string;
  maxRetries?: number;
  timeout?: number;
};

export class AgentHarness {
  private tools = new Map<string, ToolDefinition>();
  private config: Required<AgentConfig>;

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      intentModel: config.intentModel || config.model,
      maxRetries: config.maxRetries ?? 2,
      timeout: config.timeout ?? 30000,
    };
  }

  // 注册工具（类型安全）
  registerTool<T = any, R = any>(
    name: string,
    description: string,
    parameters: Record<string, any>,
    handler: (params: T) => Promise<R>
  ) {
    this.tools.set(name, { name, description, parameters, handler });
    return this;
  }

  // 批量注册工具
  registerTools(tools: Array<Omit<ToolDefinition, 'handler'> & { handler: (params: any) => Promise<any> }>) {
    tools.forEach(tool => this.registerTool(tool.name, tool.description, tool.parameters, tool.handler));
    return this;
  }

  // 1. Intent Planning（意图识别）
  async planIntent(userMessage: string, conversationHistory: any[] = []): Promise<Intent | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await this.callLLM({
        model: this.config.intentModel,
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier. Return JSON only.
Available intents: ${Array.from(this.tools.keys()).join(', ')}, general_chat.
Extract relevant parameters from user message.`,
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const content = this.extractContent(response);
      const json = content.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : null;
    } catch (error) {
      clearTimeout(timeout);
      return null;
    }
  }

  // 2. Tool Execution（工具执行，带重试和超时）
  async executeTool(toolName: string, params: any, retries = 0): Promise<ToolCall> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        tool: toolName,
        status: 'failed',
        error: `Tool ${toolName} not found`,
      };
    }

    const call: ToolCall = {
      tool: toolName,
      status: 'running',
      args: params,
      startTime: Date.now(),
    };

    try {
      const result = await this.withTimeout(
        tool.handler(params),
        this.config.timeout
      );

      call.status = 'completed';
      call.result = result;
      call.endTime = Date.now();
      return call;
    } catch (error: any) {
      // 重试逻辑
      if (retries < this.config.maxRetries && this.isRetryable(error)) {
        await this.sleep(Math.pow(2, retries) * 1000); // 指数退避
        return this.executeTool(toolName, params, retries + 1);
      }

      call.status = 'failed';
      call.error = error.message || String(error);
      call.endTime = Date.now();
      return call;
    }
  }

  // 3. Parallel Tool Execution（并发执行独立工具）
  async executeToolsParallel(toolCalls: Array<{ tool: string; params: any }>): Promise<ToolCall[]> {
    return Promise.all(
      toolCalls.map(({ tool, params }) => this.executeTool(tool, params))
    );
  }

  // 4. Sequential Tool Execution（顺序执行依赖工具）
  async executeToolsSequential(
    toolCalls: Array<{ tool: string; params: any | ((prev: any) => any) }>
  ): Promise<ToolCall[]> {
    const results: ToolCall[] = [];
    let prevResult: any = null;

    for (const { tool, params } of toolCalls) {
      const actualParams = typeof params === 'function' ? params(prevResult) : params;
      const result = await this.executeTool(tool, actualParams);
      results.push(result);
      prevResult = result.result;
    }

    return results;
  }

  // 5. Narrative Generation（结果叙述）
  async generateNarrative(
    userMessage: string,
    toolCalls: ToolCall[],
    systemPrompt?: string
  ): Promise<string> {
    const successfulCalls = toolCalls.filter(c => c.status === 'completed');
    if (successfulCalls.length === 0) {
      return '抱歉，工具执行失败，无法生成回复。';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await this.callLLM({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are a helpful assistant. Use the tool results to answer the user question. Be concise.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              user_question: userMessage,
              tool_results: successfulCalls.map(c => ({
                tool: c.tool,
                result: c.result,
              })),
            }),
          },
        ],
        max_tokens: 2000,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return this.extractContent(response) || '无法生成回复';
    } catch (error) {
      clearTimeout(timeout);
      return '生成回复时出错';
    }
  }

  // 6. 完整的 Agent 执行流程
  async run(
    userMessage: string,
    conversationHistory: any[] = [],
    options?: {
      systemPrompt?: string;
      forceTools?: Array<{ tool: string; params: any }>;
      parallel?: boolean;
    }
  ): Promise<{
    response: string;
    intent: Intent | null;
    toolCalls: ToolCall[];
  }> {
    // Step 1: Intent Planning
    const intent = await this.planIntent(userMessage, conversationHistory);

    // Step 2: Tool Execution
    let toolCalls: ToolCall[] = [];

    if (options?.forceTools) {
      // 强制执行指定工具
      toolCalls = options.parallel
        ? await this.executeToolsParallel(options.forceTools)
        : await this.executeToolsSequential(options.forceTools);
    } else if (intent && intent.name !== 'general_chat') {
      // 根据 intent 执行工具
      toolCalls = [await this.executeTool(intent.name, intent.params)];
    }

    // Step 3: Narrative Generation
    const response = toolCalls.length > 0
      ? await this.generateNarrative(userMessage, toolCalls, options?.systemPrompt)
      : await this.generateDirectResponse(userMessage, conversationHistory);

    return { response, intent, toolCalls };
  }

  // 辅助方法：直接对话（无工具调用）
  private async generateDirectResponse(userMessage: string, history: any[]): Promise<string> {
    const response = await this.callLLM({
      model: this.config.model,
      messages: [
        ...history,
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1500,
    });
    return this.extractContent(response);
  }

  // 辅助方法：调用 LLM
  private async callLLM(body: Record<string, any>): Promise<any> {
    const { signal, ...payload } = body;
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ ...payload, model: payload.model || this.config.model }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    return response.json();
  }

  // 辅助方法：提取内容
  private extractContent(data: any): string {
    return data?.choices?.[0]?.message?.content || '';
  }

  // 辅助方法：超时包装
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      ),
    ]);
  }

  // 辅助方法：判断是否可重试
  private isRetryable(error: any): boolean {
    const message = error.message || String(error);
    return /timeout|network|ECONNRESET|ETIMEDOUT/i.test(message);
  }

  // 辅助方法：延迟
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取工具列表（用于 OpenAI function calling 格式）
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
