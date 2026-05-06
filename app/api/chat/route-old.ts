import { NextResponse } from 'next/server';
import { TOOLS } from './tools';

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

type ToolTraceItem = {
  tool: string;
  status: 'called' | 'completed' | 'failed';
  args?: Record<string, any>;
  summary?: string;
};

function asAssistantResponse(content: string, toolTrace: ToolTraceItem[] = [], artifacts: Record<string, any> = {}) {
  return {
    tool_trace: toolTrace,
    ...artifacts,
    choices: [
      {
        message: {
          role: 'assistant',
          content,
        },
      },
    ],
  };
}

function extractContent(data: any) {
  const message = data?.choices?.[0]?.message;
  return message?.content || '';
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

function appendChatCompletions(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function modelConfig(requestedModel?: string) {
  return {
    url: appendChatCompletions(process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL),
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    provider: 'deepseek',
  };
}

async function chatCompletion(body: Record<string, any>) {
  const { signal, ...payload } = body;
  const config = modelConfig(payload.model);
  return fetch(config.url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ ...payload, model: config.model }),
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

async function advisorNarrativeFromTool(toolName: string, result: any, userText: string) {
  const config = modelConfig('text');
  if (!config.apiKey) return '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await withTimeout(chatCompletion({
      model: 'text',
      stream: false,
      max_tokens: 1800,
      signal: controller.signal,
      messages: [
        {
          role: 'system',
          content: [
            'You are an AI-native academic and career planning advisor for an NYU Shanghai student.',
            'Use ONLY the provided tool result. Do not reveal chain-of-thought. Do not say you are using a template.',
            'Answer in polished Simplified Chinese only. Do not use Traditional Chinese characters.',
            'Keep it concise and scannable. Use short sections, not markdown tables.',
            'Important: explain that can-take is different from should-prioritize.',
            'For schedule results, give final next-term schedule first, then deferred/future pathway, then advisor rationale.',
            'For course access results, include student major/progress, prerequisite judgment, graduation/career fit, and priority.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            user_question: userText,
            tool_name: toolName,
            tool_result: result,
          }),
        },
      ],
    }), 6500);
    clearTimeout(timeout);
    if (!response) return '';

    const data = await response.json();
    if (!response.ok || data?.error) return '';
    const content = extractContent(data);
    return content?.trim() || '';
  } catch {
    clearTimeout(timeout);
    return '';
  }
}

async function planAgentAction(userText: string) {
  const config = modelConfig('text');
  if (!config.apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await withTimeout(chatCompletion({
      model: 'text',
      stream: false,
      max_tokens: 350,
      signal: controller.signal,
      messages: [
        {
          role: 'system',
          content: [
            'You are the intent planner for an AI-native academic advisor agent.',
            'Return JSON only. Do not answer the student.',
            'Use Simplified Chinese semantics when reading Chinese input.',
            'Classify the user request into one intent:',
            'course_access, schedule_update, schedule_generation, negative_requirement_preference, requirement_search, academic_career_plan, general_advice.',
            'Use schedule_update when the student confirms a course choice or asks to put/replace/add a course in the timetable, e.g. "我上这个吧", "选这个", "换成 ANTH-UA 35", or "左边课表怎么没变" after a course was discussed.',
            'Extract course_code if present. Extract requirement if present, especially STS/Science, Technology and Society.',
            'Extract preferred_days and avoid_days using M,T,W,R,F. Extract preferred_formats such as Online, Hybrid, In Person.',
            'negative_requirement_preference means the student says they do not want, dislike, avoid, or hope to skip a required area/course.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            text: userText,
            json_schema: {
              intent: 'schedule_update',
              confidence: 0.9,
              course_code: '',
              requirement: '',
              negative_preference: false,
              preferred_days: ['T', 'R'],
              avoid_days: ['M'],
              preferred_formats: ['Online'],
              needs_profile: true,
              rationale: 'short private planning note, not chain-of-thought',
            },
          }),
        },
      ],
    }), 3000);
    clearTimeout(timeout);
    if (!response) return null;

    const data = await response.json();
    if (!response.ok || data?.error) return null;
    const raw = extractContent(data).trim();
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    return JSON.parse(jsonText);
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function summarizeTraceResult(toolName: string, result: any) {
  if (result?.error) return result.error;
  if (toolName === 'get_student_profile') {
    return `Loaded profile for ${result?.student_id || 'student'} (${result?.major || 'unknown major'})`;
  }
  if (toolName === 'generate_academic_career_plan') {
    return `Generated academic/career plan; progress ${result?.degree_audit?.progress_percent ?? 'unknown'}%`;
  }
  if (toolName === 'generate_personalized_schedule') {
    return `Generated ${result?.term || 'term'} schedule with ${(result?.schedule || []).length} selected courses`;
  }
  if (toolName === 'find_requirement_courses') {
    return result?.conclusion || `Checked ${(result?.counts?.approved_requirement_courses ?? 0)} approved courses`;
  }
  if (toolName === 'evaluate_course_access_with_plan') {
    return result?.can_take_now
      ? `Student can take ${result?.target_course?.course_code || 'target course'}`
      : `Missing ${(result?.missing_prerequisites || []).join(', ') || 'prerequisites'}; generated bridge plan`;
  }
  if (toolName === 'generate_study_away_plan') {
    return `Generated Study Away plan with ${(result?.recommendations || []).length} recommendations`;
  }
  if (toolName === 'get_major_requirements') return 'Loaded major requirements';
  if (toolName === 'get_study_away_rules') return 'Loaded Study Away rules';
  if (toolName === 'search_courses') return `Found ${(result || []).length || result?.length || 0} courses`;
  return 'Tool result returned';
}

function summarizeToolResult(toolName: string, result: any) {
  if (toolName === 'generate_academic_career_plan') {
    const missing = result?.degree_audit?.missing_courses || [];
    const tracks = result?.career_tracks?.map((track: any) => track.title).join(', ') || 'Machine Learning / Data Science tracks';
    return [
      `我已经读取你的 profile 并生成了学术/职业规划。`,
      `当前专业：${result?.student?.major || '未知'}；毕业要求进度约 ${result?.degree_audit?.progress_percent ?? '未知'}%。`,
      `仍需重点关注的课程：${missing.length ? missing.join(', ') : '目前没有在数据中识别到核心缺口'}.`,
      `建议职业方向：${tracks}.`,
      `下一步：优先补齐缺口课程，同时围绕 AI/ML 或 Data Science 做一个可展示的项目作品集。`,
    ].join('\n');
  }

  if (toolName === 'generate_study_away_plan') {
    const recommendations = result?.recommendations || [];
    return [
      `我已经基于你的专业要求、已修课程、等价课程和 Study Away 规则生成了规划。`,
      `推荐优先关注：${recommendations.map((item: any) => `${item.code}${item.replaces ? ` 替代 ${item.replaces}` : ''}`).join(', ') || '暂无推荐课程'}.`,
      `请同时检查先修课、注册规则和 backup courses。`,
    ].join('\n');
  }

  if (toolName === 'generate_personalized_schedule') {
    const schedule = result?.schedule || [];
    const deferred = result?.deferred_courses || [];
    const futurePlan = result?.future_plan || [];
    const lines = schedule.map((item: any) => {
      const section = item.selected_section || {};
      return `- ${item.course_code} ${item.title}: ${item.credits} credits, ${section.days?.join('/') || ''} ${section.start || ''}-${section.end || ''}, ${section.format || ''}. 原因：${(item.why_selected || []).join('；')}`;
    });
    return [
      `我已经按你的 profile、已修课、先修关系、毕业要求、偏好和职业目标生成了 ${result?.term || '下一学期'} 课表。`,
      `总学分：${result?.total_credits ?? 0}。职业目标：${result?.career_plan?.target || 'AI / Data Science'}。`,
      lines.join('\n') || '当前没有找到可排入课表的课程。',
      deferred.length ? `暂缓课程：${deferred.slice(0, 3).map((item: any) => `${item.course_code}（${item.reason}）`).join('；')}` : '',
      futurePlan.length ? `后续规划：${futurePlan.map((item: any) => `${item.term}: ${item.focus}${item.courses?.length ? `（${item.courses.join(', ')}）` : ''}`).join('；')}` : '',
      `职业规划建议：${(result?.career_plan?.next_steps || []).join(' ')}`,
    ].filter(Boolean).join('\n');
  }

  if (toolName === 'find_requirement_courses') {
    const results = result?.results || [];
    return [
      `我查了 ${result?.query?.site || '全部校区'} 可满足 ${result?.query?.requirement} 的课程，并继续检查课程库里的 section/format。`,
      `结论：${result?.conclusion}`,
      `覆盖：批准课程 ${result?.counts?.approved_requirement_courses ?? 0} 门，课程库找到 ${result?.counts?.found_in_course_database ?? 0} 门，有 section 数据 ${result?.counts?.with_section_data ?? 0} 门，符合 ${result?.query?.format || '目标形式'} 的 ${result?.counts?.matching_requested_format ?? 0} 门。`,
      results.length ? `示例：${results.slice(0, 5).map((item: any) => `${item.course_code} ${item.title}`).join('；')}` : '当前数据里没有符合该形式筛选的结果。',
    ].join('\n');
  }

  if (toolName === 'evaluate_course_access_with_plan') {
    const target = result?.target_course || {};
    const student = result?.student || {};
    const assessment = result?.advisor_assessment || {};
    const bridgeCourses = result?.bridge_plan || result?.bridge_courses || [];
    const sequence = result?.recommended_sequence || [];
    if (result?.can_take_now) {
      return [
        `结论：以你现在的档案（${student.major || '当前专业'}，${student.year || ''}）来看，你可以注册 ${target.course_code} ${target.title}。`,
        `先修判断：你的已修课和等价课覆盖了该课先修：${(target.prerequisites || []).join(', ') || '无先修要求'}。`,
        `Advisor 判断：${assessment.advisor_fit || '需要 advisor 进一步确认'}，优先级 ${assessment.priority || 'unknown'}。${(assessment.reasons || []).join(' ')}`,
        assessment.priority === 'low'
          ? `我的建议：它能上，但不建议作为下学期优先课；除非你只是想作为自由选修，否则应该先补 ${assessment.missing_major_gaps?.join(', ') || '当前专业缺口'} 或 STS/Core。`
          : `我的建议：可以考虑放入 ${sequence?.[0]?.term || '目标学期'} 课表，但仍要和其他毕业缺口、时间冲突、学分上限一起排序。`,
      ].join('\n');
    }

    return [
      `结论：以你现在的档案（${student.major || '当前专业'}，${student.year || ''}）来看，你现在不建议直接上 ${target.course_code} ${target.title}。`,
      `原因：还缺少先修课 ${result?.missing_prerequisites?.join(', ') || '未识别'}。`,
      `Advisor 判断：${assessment.advisor_fit || '需要 advisor 进一步确认'}，优先级 ${assessment.priority || 'unknown'}。${(assessment.reasons || []).join(' ')}`,
      bridgeCourses.length
        ? `未来补课规划：按顺序先上 ${bridgeCourses.map((item: any) => `${item.course_code || item.missing_prerequisite} ${item.title || ''}${item.equivalent_note ? `（${item.equivalent_note}）` : ''}`).join(' -> ')}，完成后再安排 ${target.course_code}。这些是未来路径，不会直接塞进下学期课表。`
        : '当前课程库里没有找到可直接补这个先修的课程，需要 advisor 确认可替代方案。',
      `后续路径：${sequence.map((item: any) => `${item.term}: ${item.action}`).join(' -> ')}`,
    ].join('\n');
  }

  return `我查到了工具结果：\n${JSON.stringify(result, null, 2).slice(0, 2500)}`;
}

function extractCourseCode(text: string) {
  const match = text.match(/[A-Z]{2,5}-[A-Z]{2,4}\s*\d+[A-Z]?/i);
  return match ? match[0].toUpperCase().replace(/\s+/, ' ') : '';
}

function extractCourseCodes(text: string) {
  return Array.from(text.matchAll(/[A-Z]{2,5}-[A-Z]{2,4}\s*\d+[A-Z]?/gi))
    .map((match) => match[0].toUpperCase().replace(/\s+/, ' '));
}

function latestCourseCodeFromPriorUserMessages(messages: any[]) {
  const priorUsers = [...(messages || [])]
    .reverse()
    .filter((message: any) => message.role === 'user')
    .slice(1);

  for (const message of priorUsers) {
    const codes = extractCourseCodes(message.content || '');
    if (codes.length) return codes[codes.length - 1];
  }
  return '';
}

function isNegativePreference(text: string) {
  return /不想|不要|不愿意|不喜欢|避免|避开|讨厌|不考虑|不太想|能不能不上|可不可以不上/i.test(text);
}

function parseSchedulePreferences(text: string) {
  const dayMap: Array<[RegExp, string, string]> = [
    [/周一|星期一|Monday|Mon\b/gi, 'M', '周一'],
    [/周二|星期二|Tuesday|Tue\b/gi, 'T', '周二'],
    [/周三|星期三|Wednesday|Wed\b/gi, 'W', '周三'],
    [/周四|星期四|Thursday|Thu\b/gi, 'R', '周四'],
    [/周五|星期五|Friday|Fri\b/gi, 'F', '周五'],
  ];
  const avoidDays = new Set<string>();
  const preferredDays = new Set<string>();

  dayMap.forEach(([pattern, day]) => {
    const matches = Array.from(text.matchAll(pattern));
    matches.forEach((match) => {
      const index = match.index ?? 0;
      const before = text.slice(Math.max(0, index - 8), index);
      const clauseBefore = text.slice(Math.max(0, index - 18), index);
      const localAvoid = /不想|不要|避免|避开|不能|没法/.test(clauseBefore) || /不想|不要|避免|避开|不能|没法/.test(before);
      const localPrefer = /有没有|有无|想要|希望|只想|尽量|能不能|可以/.test(clauseBefore);

      if (localPrefer) {
        preferredDays.add(day);
        avoidDays.delete(day);
      } else if (localAvoid) {
        avoidDays.add(day);
      }
    });
  });

  avoidDays.forEach((day) => preferredDays.delete(day));
  const formats = [];
  if (/online|线上|网课|remote|virtual/i.test(text)) formats.push('Online');
  if (/hybrid|混合/i.test(text)) formats.push('Hybrid');
  if (/in person|线下|面授/i.test(text)) formats.push('In Person');

  return {
    avoid_days: Array.from(avoidDays),
    preferred_days: Array.from(preferredDays),
    preferred_formats: formats.length ? formats : undefined,
  };
}

export async function POST(request: Request) {
  const { messages, image, fileType } = await request.json();
  const toolTrace: ToolTraceItem[] = [];

  const textModelConfig = modelConfig('text');
  if (!textModelConfig.apiKey) {
    return NextResponse.json(asAssistantResponse('后端没有配置 DeepSeek API Key，所以暂时无法调用模型。请配置 DEEPSEEK_API_KEY。', toolTrace));
  }

  if (image) {
    return NextResponse.json(asAssistantResponse('当前文字 advisor 只使用 DeepSeek。图片/PDF 成绩单识别已暂时关闭，请先手动输入课程代码或使用已登录账号的 profile 数据。', toolTrace));
  }

  const lastUserText = [...(messages || [])].reverse().find((message: any) => message.role === 'user')?.content || '';
  toolTrace.push({ tool: 'ai_intent_planner', status: 'called', args: { text: lastUserText } });
  const intentPlan = await planAgentAction(lastUserText);
  toolTrace.push({
    tool: 'ai_intent_planner',
    status: intentPlan ? 'completed' : 'failed',
    summary: intentPlan
      ? `Intent: ${intentPlan.intent || 'unknown'}${intentPlan.requirement ? `, requirement: ${intentPlan.requirement}` : ''}${intentPlan.course_code ? `, course: ${intentPlan.course_code}` : ''}`
      : 'Planner unavailable; using deterministic safety routing',
  });

  const requestedCourseCode = extractCourseCode(lastUserText);
  const requestedCourseCodes = extractCourseCodes(lastUserText);
  const priorCourseCode = latestCourseCodeFromPriorUserMessages(messages || []);
  const plannedIntent = intentPlan?.intent || '';
  const plannedCourseCode = (intentPlan?.course_code || requestedCourseCode || '').toString().toUpperCase();
  const plannedRequirement = intentPlan?.requirement || '';
  const plannedNegativePreference = Boolean(intentPlan?.negative_preference) || isNegativePreference(lastUserText);
  const plannedPrefs = {
    avoid_days: Array.isArray(intentPlan?.avoid_days) ? intentPlan.avoid_days : undefined,
    preferred_days: Array.isArray(intentPlan?.preferred_days) ? intentPlan.preferred_days : undefined,
    preferred_formats: Array.isArray(intentPlan?.preferred_formats) ? intentPlan.preferred_formats : undefined,
  };

  const scheduleUpdateIntent = /换成|替换|改成|换到|换为|放进|加入|加到|换这个|上这个|选这个|就这个|定这个|用这个|我要上|我想上/i.test(lastUserText);
  const scheduleNotUpdatedFollowup = /左边.*没.*变|课表.*没.*变|没有.*更新|没更新|怎么没变|为什么.*没变/i.test(lastUserText);
  const targetForScheduleUpdate = requestedCourseCodes.length
    ? requestedCourseCodes[requestedCourseCodes.length - 1]
    : (scheduleNotUpdatedFollowup ? priorCourseCode : '');

  const aiWantsScheduleUpdate = plannedIntent === 'schedule_update';
  const fallbackWantsScheduleUpdate = !intentPlan && (scheduleUpdateIntent || scheduleNotUpdatedFollowup);

  if (targetForScheduleUpdate && (aiWantsScheduleUpdate || fallbackWantsScheduleUpdate)) {
    const targetCourseCode = targetForScheduleUpdate;
    const removeCourseCode = requestedCourseCodes.length > 1 ? requestedCourseCodes[0] : undefined;
    const parsedPrefs = parseSchedulePreferences(lastUserText);
    const args = {
      student_id: 'yl8888',
      term: 'Fall 2026',
      target_course_code: targetCourseCode,
      remove_course_code: removeCourseCode,
      ...parsedPrefs,
    };
    toolTrace.push({ tool: 'replace_schedule_course', status: 'called', args });
    const result = await callTool(request.url, 'replace_schedule_course', args);
    toolTrace.push({ tool: 'replace_schedule_course', status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult('generate_personalized_schedule', result) });
    const narrative = await advisorNarrativeFromTool('replace_schedule_course', result, lastUserText);
    return NextResponse.json(asAssistantResponse(narrative || summarizeToolResult('generate_personalized_schedule', result), toolTrace, { schedule_result: result }));
  }

  if (plannedCourseCode && (plannedIntent === 'course_access' || /能不能上|能上|可以上|能选|可以选|该不该上|prereq|pre|先修|eligible|can i take|can take/i.test(lastUserText))) {
    const profileArgs = { student_id: 'yl8888' };
    toolTrace.push({ tool: 'get_student_profile', status: 'called', args: profileArgs });
    const profile = await callTool(request.url, 'get_student_profile', profileArgs);
    toolTrace.push({ tool: 'get_student_profile', status: profile?.error ? 'failed' : 'completed', summary: summarizeTraceResult('get_student_profile', profile) });

    const args = { student_id: 'yl8888', course_code: plannedCourseCode, term: 'Fall 2026' };
    toolTrace.push({ tool: 'evaluate_course_access_with_plan', status: 'called', args });
    const result = await callTool(request.url, 'evaluate_course_access_with_plan', args);
    toolTrace.push({ tool: 'evaluate_course_access_with_plan', status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult('evaluate_course_access_with_plan', result) });
    const narrative = await advisorNarrativeFromTool('evaluate_course_access_with_plan', result, lastUserText);
    return NextResponse.json(asAssistantResponse(narrative || summarizeToolResult('evaluate_course_access_with_plan', result), toolTrace, { course_access_result: result }));
  }

  if (plannedIntent === 'schedule_generation' || /课表|schedule|排课|选课方案|选什么课|能选什么|下学期.*选|下学期.*课|推荐.*课|偏好|喜欢|周一|周二|周三|周四|周五|online|线上|hybrid|pre|prereq|先修/i.test(lastUserText)) {
    const profileArgs = { student_id: 'yl8888' };
    toolTrace.push({ tool: 'get_student_profile', status: 'called', args: profileArgs });
    const profile = await callTool(request.url, 'get_student_profile', profileArgs);
    toolTrace.push({ tool: 'get_student_profile', status: profile?.error ? 'failed' : 'completed', summary: summarizeTraceResult('get_student_profile', profile) });

    const parsedPrefs = parseSchedulePreferences(lastUserText);
    const prefs = {
      ...parsedPrefs,
      avoid_days: plannedPrefs.avoid_days?.length ? plannedPrefs.avoid_days : parsedPrefs.avoid_days,
      preferred_days: plannedPrefs.preferred_days?.length ? plannedPrefs.preferred_days : parsedPrefs.preferred_days,
      preferred_formats: plannedPrefs.preferred_formats?.length ? plannedPrefs.preferred_formats : parsedPrefs.preferred_formats,
    };
    const args = { student_id: 'yl8888', term: 'Fall 2026', ...prefs };
    toolTrace.push({ tool: 'generate_personalized_schedule', status: 'called', args });
    const result = await callTool(request.url, 'generate_personalized_schedule', args);
    toolTrace.push({ tool: 'generate_personalized_schedule', status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult('generate_personalized_schedule', result) });
    const narrative = await advisorNarrativeFromTool('generate_personalized_schedule', result, lastUserText);
    return NextResponse.json(asAssistantResponse(narrative || summarizeToolResult('generate_personalized_schedule', result), toolTrace, { schedule_result: result }));
  }

  if (
    (
      plannedIntent === 'negative_requirement_preference'
      || (/STS|Science,? Technology/i.test(lastUserText) && plannedNegativePreference)
    )
    && (/STS|Science,? Technology/i.test(`${lastUserText} ${plannedRequirement}`) || !plannedRequirement)
  ) {
    const profileArgs = { student_id: 'yl8888' };
    toolTrace.push({ tool: 'get_student_profile', status: 'called', args: profileArgs });
    const profile = await callTool(request.url, 'get_student_profile', profileArgs);
    toolTrace.push({ tool: 'get_student_profile', status: profile?.error ? 'failed' : 'completed', summary: summarizeTraceResult('get_student_profile', profile) });

    const planArgs = { student_id: 'yl8888' };
    toolTrace.push({ tool: 'generate_academic_career_plan', status: 'called', args: planArgs });
    const plan = await callTool(request.url, 'generate_academic_career_plan', planArgs);
    toolTrace.push({ tool: 'generate_academic_career_plan', status: plan?.error ? 'failed' : 'completed', summary: summarizeTraceResult('generate_academic_career_plan', plan) });

    const courseArgs = {
      requirement: plannedRequirement || 'Science, Technology and Society',
      site: /美国|US|USA|New York|纽约/i.test(lastUserText) ? 'New York' : undefined,
      max_results: 6,
    };
    toolTrace.push({ tool: 'find_requirement_courses', status: 'called', args: courseArgs });
    const courses = await callTool(request.url, 'find_requirement_courses', courseArgs);
    toolTrace.push({ tool: 'find_requirement_courses', status: courses?.error ? 'failed' : 'completed', summary: summarizeTraceResult('find_requirement_courses', courses) });

    const result = { profile, plan, alternatives: courses };
    const narrative = await advisorNarrativeFromTool('negative_sts_preference', result, lastUserText);
    const fallback = [
      '我理解你不想上 STS。这里 advisor 视角要分两层看：',
      '',
      `如果你的 degree audit 里 STS/Core 还没满足，它一般不能直接跳过，否则会影响毕业进度。你现在的专业是 ${profile?.major || 'Data Science - AI Concentration'}，所以我会优先保护毕业要求，再尽量照顾你的偏好。`,
      '',
      '更聪明的做法不是硬塞一门 STS，而是找更贴近 AI/数据方向的低摩擦选项，比如技术伦理、AI 与社会、科学政策、数据与社会影响这类课。如果你已经满足 STS，那它就不应该再被放进优先课表，只能作为兴趣或 free elective。',
      courses?.results?.length
        ? `我也查了可替代选项，后续排课时会优先从这些候选里挑最不冲突的：${courses.results.slice(0, 4).map((item: any) => `${item.course_code} ${item.title}`).join('；')}。`
        : '当前数据里没有足够好的 STS 替代候选，所以我会先把它标成毕业风险点，而不是直接推荐一串课。'
    ].join('\n');
    return NextResponse.json(asAssistantResponse(narrative || fallback, toolTrace));
  }

  if (plannedIntent === 'requirement_search' || /STS|Science,? Technology|online|remote|virtual|线上|网课/i.test(lastUserText)) {
    const args = {
      requirement: plannedRequirement || 'Science, Technology and Society',
      site: /美国|US|USA|New York|纽约/i.test(lastUserText) ? 'New York' : undefined,
      format: /online|remote|virtual|线上|网课/i.test(lastUserText) ? 'Online' : undefined,
    };
    toolTrace.push({ tool: 'find_requirement_courses', status: 'called', args });
    const result = await callTool(request.url, 'find_requirement_courses', args);
    toolTrace.push({ tool: 'find_requirement_courses', status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult('find_requirement_courses', result) });
    const narrative = await advisorNarrativeFromTool('find_requirement_courses', result, lastUserText);
    return NextResponse.json(asAssistantResponse(narrative || summarizeToolResult('find_requirement_courses', result), toolTrace));
  }

  if (plannedIntent === 'academic_career_plan' || /推荐|能上|该上|规划|职业|毕业|路径|课表|recommend|plan|career|graduate/i.test(lastUserText)) {
    const args = { student_id: 'yl8888' };
    toolTrace.push({ tool: 'generate_academic_career_plan', status: 'called', args });
    const result = await callTool(request.url, 'generate_academic_career_plan', { student_id: 'yl8888' });
    toolTrace.push({ tool: 'generate_academic_career_plan', status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult('generate_academic_career_plan', result) });
    const narrative = await advisorNarrativeFromTool('generate_academic_career_plan', result, lastUserText);
    return NextResponse.json(asAssistantResponse(narrative || summarizeToolResult('generate_academic_career_plan', result), toolTrace));
  }

  const workingMessages = [...messages];
  let lastToolName = '';
  let lastToolResult: any = null;

  for (let step = 0; step < 4; step += 1) {
    const response = await chatCompletion({
      model: 'text',
      messages: workingMessages,
      stream: false,
      max_tokens: 1800,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      const message = data?.error?.message || data?.message || `Model request failed with status ${response.status}`;
      return NextResponse.json(asAssistantResponse(`模型调用失败：${message}`, toolTrace));
    }

    const assistantMessage = data.choices?.[0]?.message;
    if (!assistantMessage) {
      return NextResponse.json(asAssistantResponse('模型没有返回可解析的 message。', toolTrace));
    }

    const toolCalls = assistantMessage.tool_calls || [];
    const content = extractContent(data);

    if (!toolCalls.length) {
      return NextResponse.json(asAssistantResponse(content || '模型没有返回正文内容。', toolTrace));
    }

    workingMessages.push(assistantMessage);

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name;
      let args: Record<string, any> = {};

      try {
        const rawArgs = toolCall.function?.arguments || '{}';
        args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
      } catch {
        args = {};
      }

      toolTrace.push({ tool: name, status: 'called', args });
      const result = await callTool(request.url, name, args);
      toolTrace.push({ tool: name, status: result?.error ? 'failed' : 'completed', summary: summarizeTraceResult(name, result) });
      lastToolName = name;
      lastToolResult = result;

      workingMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  const finalResponse = await chatCompletion({
    model: 'text',
    messages: [
      ...workingMessages,
      {
        role: 'system',
        content: 'Use the tool results above to answer the student in concise Chinese. Include conclusion, evidence, and next actions.',
      },
    ],
    stream: false,
    max_tokens: 1800,
  });

  const finalData = await finalResponse.json();
  const finalContent = extractContent(finalData);

  if (finalContent) {
    return NextResponse.json(asAssistantResponse(finalContent, toolTrace));
  }

  if (lastToolResult) {
    return NextResponse.json(asAssistantResponse(summarizeToolResult(lastToolName, lastToolResult), toolTrace));
  }

  return NextResponse.json(asAssistantResponse('暂时没有生成回复，请换一种问法再试。', toolTrace));
}
