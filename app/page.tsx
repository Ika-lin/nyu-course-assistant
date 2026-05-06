'use client';

import React, { useEffect, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ToolTraceItem = {
  iteration?: number;
  thinking?: string;
  tool: string;
  status: 'called' | 'completed' | 'failed' | 'error';
  args?: Record<string, any>;
  result?: any;
  summary?: string;
  timestamp?: string;
};

type Profile = {
  name: string;
  major: string;
  year: string;
  completedCourses: string[];
};

type ScheduleItem = {
  day: string;
  time: string;
  startHour?: number;
  course: string;
  room: string;
};

type PersonalizedScheduleResult = {
  schedule?: Array<{
    course_code: string;
    title: string;
    campus: string;
    selected_section?: {
      days?: string[];
      start?: string;
      end?: string;
      location?: string;
      format?: string;
    };
  }>;
};

type CourseAccessResult = {
  bridge_plan?: Array<{
    course_code?: string;
    title?: string;
    campus?: string;
    selected_section?: {
      days?: string[];
      start?: string;
      end?: string;
      location?: string;
      format?: string;
    };
  }>;
  bridge_courses?: Array<{
    course_code?: string;
    title?: string;
    campus?: string;
    selected_section?: {
      days?: string[];
      start?: string;
      end?: string;
      location?: string;
      format?: string;
    };
  }>;
  recommended_sequence?: Array<{
    course_code?: string;
    title?: string;
    selected_section?: {
      days?: string[];
      start?: string;
      end?: string;
      location?: string;
      format?: string;
    };
    courses?: CourseAccessResult['bridge_courses'];
  }>;
};

type PlanCourse = {
  code: string;
  title: string;
  credits: number;
  reason: string;
  evidence: string[];
  risk: string | null;
  registrationRule: string;
  section: {
    section: string;
    instructor: string;
    time: string;
    location: string;
    seats_available: number;
  } | null;
};

type PlanResult = {
  summary: string;
  selectedCourses: PlanCourse[];
  schedule: ScheduleItem[];
  missingRequirements: string[];
  rules: {
    priorityDeadline?: string;
    backupCourses?: string;
    creditLimits?: string;
    warnings?: string[];
  };
  warnings: string[];
};

type AcademicPlanResult = {
  student: {
    student_id: string;
    name: string;
    major: string;
    normalized_major: string;
    year: string;
    gpa: number;
    credits_completed: number;
  };
  degree_audit: {
    missing_courses: string[];
    completed_required_courses: string[];
    progress_percent: number;
    capstone: Record<string, string> | null;
  };
  future_semester_plan: Array<{
    term: string;
    focus: string;
    recommended_courses: string[];
    actions: string[];
  }>;
  career_tracks: Array<{
    title: string;
    why_it_fits: string;
    preparation: string[];
  }>;
};

const DAYS = [
  { key: 'Mon', label: '周一' },
  { key: 'Tue', label: '周二' },
  { key: 'Wed', label: '周三' },
  { key: 'Thu', label: '周四' },
  { key: 'Fri', label: '周五' },
];

const TIMES = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];
const STORAGE_KEY = 'nyu-course-assistant-state';
const LOGIN_KEY = 'nyu-course-assistant-logged-in';
const PROFILE_VERSION_KEY = 'nyu-course-assistant-profile-version';
const DEMO_PROFILE_VERSION = 'ds-ai-co28-v1';

const DEMO_PROFILE: Profile = {
  name: '',
  major: '',
  year: '',
  completedCourses: [],
};

function plannedTraceForPrompt(text: string): ToolTraceItem[] {
  if (/课表|schedule|排课|选课方案|选什么课|能选什么|下学期.*选|下学期.*课|推荐.*课|偏好|喜欢|周一|周二|周三|周四|周五|online|线上|hybrid|pre|prereq|先修/i.test(text)) {
    const courseCode = text.match(/[A-Z]{2,5}-[A-Z]{2,4}\s*\d+[A-Z]?/i)?.[0]?.toUpperCase();
    if (courseCode && /能不能上|能上|可以上|能选|可以选|该不该上|prereq|pre|先修|eligible|can i take|can take/i.test(text)) {
      return [
        { tool: 'get_student_profile', status: 'called', args: { student_id: 'yl8888' }, summary: 'Reading completed courses and equivalencies' },
        { tool: 'evaluate_course_access_with_plan', status: 'called', args: { course_code: courseCode }, summary: 'Checking prerequisites and building bridge plan if needed' },
      ];
    }

    return [
      { tool: 'get_student_profile', status: 'called', args: { student_id: 'yl8888' }, summary: 'Reading logged-in student profile' },
      { tool: 'generate_personalized_schedule', status: 'called', args: { term: 'Fall 2026' }, summary: 'Checking prerequisites, preferences, meeting times, and career fit' },
    ];
  }

  if (/STS|Science,? Technology|online|remote|virtual|线上|网课/i.test(text)) {
    return [
      { tool: 'find_requirement_courses', status: 'called', args: { requirement: 'Science, Technology and Society' }, summary: 'Searching approved requirement courses and matching section formats' },
    ];
  }

  if (/推荐|能上|该上|规划|职业|毕业|路径|recommend|plan|career|graduate/i.test(text)) {
    return [
      { tool: 'get_student_profile', status: 'called', args: { student_id: 'yl8888' }, summary: 'Reading student context' },
      { tool: 'generate_academic_career_plan', status: 'called', args: { student_id: 'yl8888' }, summary: 'Auditing requirements and career pathway' },
    ];
  }

  return [
    { tool: 'agent_reasoning', status: 'called', summary: 'Deciding which academic tools are needed' },
  ];
}

function toSimplifiedChinese(text: string) {
  const map: Record<string, string> = {
    個: '个', 學: '学', 課: '课', 議: '议', 實: '实', 現: '现', 無: '无', 條: '条',
    線: '线', 體: '体', 門: '门', 額: '额', 適: '适', 這: '这', 會: '会', 對: '对',
    裡: '里', 點: '点', 預: '预', 諮: '咨', 詢: '询', 篩: '筛', 優: '优', 選: '选',
    滿: '满', 項: '项', 結: '结', 論: '论', 替: '替', 換: '换', 後: '后', 張: '张',
    專: '专', 業: '业', 規: '规', 劃: '划', 職: '职', 畢: '毕', 當: '当', 補: '补',
    應: '应', 該: '该', 資: '资', 訊: '讯', 據: '据', 備: '备',
  };
  return text.replace(/[個學課議實現無條線體門額適這會對裡點預諮詢篩優選滿項結論換後張專業規劃職畢當補應該資訊據備]/g, (char) => map[char] || char);
}

function dayKey(day: string) {
  const map: Record<string, string> = {
    M: 'Mon',
    MON: 'Mon',
    MONDAY: 'Mon',
    T: 'Tue',
    TU: 'Tue',
    TUE: 'Tue',
    TUESDAY: 'Tue',
    W: 'Wed',
    WED: 'Wed',
    WEDNESDAY: 'Wed',
    R: 'Thu',
    TH: 'Thu',
    THU: 'Thu',
    THURSDAY: 'Thu',
    F: 'Fri',
    FRI: 'Fri',
    FRIDAY: 'Fri',
  };
  return map[(day || '').toUpperCase()] || day;
}

function hourLabel(value?: string) {
  if (!value) return '9 AM';
  const hour = Number(value.split(':')[0]);
  if (Number.isNaN(hour)) return '9 AM';
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function startHour(value?: string) {
  const hour = Number(value?.split(':')[0]);
  return Number.isNaN(hour) ? 9 : hour;
}

function gridHour(label: string) {
  const [rawHour, period] = label.split(' ');
  const hour = Number(rawHour);
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function scheduleFromPersonalizedResult(result?: PersonalizedScheduleResult): ScheduleItem[] {
  return (result?.schedule || []).flatMap((item) => {
    const section = item.selected_section || {};
    return (section.days || []).map((day) => ({
      day: dayKey(day),
      time: `${hourLabel(section.start)} ${section.start || ''}-${section.end || ''}`.trim(),
      startHour: startHour(section.start),
      course: `${item.course_code} ${item.title}`,
      room: `${item.campus} · ${section.format || ''} · ${section.location || ''}`,
    }));
  });
}

function scheduleFromCourseAccessResult(result?: CourseAccessResult): ScheduleItem[] {
  if (!result?.recommended_sequence?.some((item) => item.selected_section)) return [];

  const bridgeItems = ((result?.bridge_plan?.length ? result.bridge_plan : result?.bridge_courses) || []).filter((item) => item.selected_section);
  const directItems = (result?.recommended_sequence || [])
    .filter((item) => item.course_code && item.selected_section)
    .map((item) => ({
      course_code: item.course_code || '',
      title: item.title || '',
      campus: '',
      selected_section: item.selected_section,
    }));

  return [...bridgeItems, ...directItems].flatMap((item) => {
    const section = item.selected_section || {};
    return (section.days || []).map((day) => ({
      day: dayKey(day),
      time: `${hourLabel(section.start)} ${section.start || ''}-${section.end || ''}`.trim(),
      startHour: startHour(section.start),
      course: `${item.course_code || ''} ${item.title || ''}`.trim(),
      room: `${item.campus || ''} · ${section.format || ''} · ${section.location || ''}`,
    }));
  });
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState('yl8888');
  const [loginPassword, setLoginPassword] = useState('12345678');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolTrace, setToolTrace] = useState<ToolTraceItem[]>([]);
  const [input, setInput] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [profile, setProfile] = useState<Profile>({
    ...DEMO_PROFILE,
  });
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [academicPlan, setAcademicPlan] = useState<AcademicPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'courses' | 'community'>('plan');
  const [chatWidth, setChatWidth] = useState(420);
  const [resizingChat, setResizingChat] = useState(false);
  const [agentPanelMinimized, setAgentPanelMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const isLoggedIn = window.localStorage.getItem(LOGIN_KEY) === 'true';
    setLoggedIn(isLoggedIn);

    if (isLoggedIn) {
      loadProfile(loginId).catch(() => window.localStorage.removeItem(LOGIN_KEY));
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.schedule) setSchedule(parsed.schedule);
      if (parsed.plan) setPlan(parsed.plan);
      if (parsed.academicPlan) setAcademicPlan(parsed.academicPlan);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, schedule, plan, academicPlan }));
  }, [profile, schedule, plan, academicPlan]);

  useEffect(() => {
    if (!resizingChat) return;

    const handleMove = (event: MouseEvent) => {
      const nextWidth = Math.min(720, Math.max(320, window.innerWidth - event.clientX));
      setChatWidth(nextWidth);
    };
    const handleUp = () => setResizingChat(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingChat]);

  const systemPrompt = `你是一个 AI-native Academic & Career Planning Agent for NYU Shanghai students. 你不是普通聊天机器人；你必须通过 tools 读取学生 profile、专业要求、课程数据、等价课程、Study Away 规则和毕业要求，再给出学术与职业规划建议。涉及个人规划、毕业要求、课程选择、Study Away、职业方向的问题，必须优先调用 get_student_profile 或 generate_academic_career_plan 等工具。当前登录学生 id=yl8888。当前前端档案：姓名=${profile.name || '未设置'}，专业=${profile.major || '未设置'}，年级=${profile.year || '未设置'}，已完成/当前课程=${profile.completedCourses.join(', ') || '无'}。

回答时请说明：结论、依据数据、下一步行动。不要凭空编造课程规则或职业要求。`;

  const updateAssistantMessage = (content: string) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: 'assistant', content };
      return next;
    });
  };

  const sendMessage = async (override?: string) => {
    const text = override || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const history = [...messages, userMessage];

    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setToolTrace(plannedTraceForPrompt(text)); // Reset trace for new query

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...history],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '没有收到模型回复。';

      // Keep trace if returned, don't clear it
      if (data.tool_trace && data.tool_trace.length > 0) {
        setToolTrace(data.tool_trace);
      }

      // Update schedule if returned
      if (data.schedule_result?.schedule) {
        const nextSchedule = scheduleFromPersonalizedResult(data.schedule_result);
        console.log('[Schedule Update] Generated schedule:', nextSchedule);
        setSchedule(nextSchedule);
        setActiveTab('plan');
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, schedule: nextSchedule, plan, academicPlan }));
        console.log('[Schedule Update] Schedule state updated, switched to plan tab');
      }
      if (data.course_access_result) {
        const accessSchedule = scheduleFromCourseAccessResult(data.course_access_result);
        if (accessSchedule.length) {
          setSchedule(accessSchedule);
          setActiveTab('plan');
        }
      }

      updateAssistantMessage(toSimplifiedChinese(content));
    } catch (error) {
      console.error(error);
        updateAssistantMessage('抱歉，请求失败了。请检查 DEEPSEEK_API_KEY 或稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  const generateDataPlan = async () => {
    setPlanning(true);
    setToolTrace([
      { tool: 'get_student_profile', status: 'called', args: { student_id: loginId.trim() }, summary: 'Reading completed courses and profile' },
      { tool: 'generate_study_away_plan', status: 'called', summary: 'Checking course equivalencies, requirements, and registration rules' },
    ]);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data: PlanResult = await response.json();
      setPlan(data);
      setSchedule(data.schedule || []);
      setActiveTab('plan');
      setToolTrace([
        { tool: 'get_student_profile', status: 'completed', args: { student_id: loginId.trim() }, summary: 'Loaded student profile' },
        { tool: 'generate_study_away_plan', status: 'completed', summary: `Selected ${data.selectedCourses?.length || 0} recommended courses` },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${data.summary}\n\n我已经根据课程数据、等价课程、专业要求和 Study Away 规则生成了初步规划。你可以继续问我为什么推荐某门课，或让我调整偏好。`,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'assistant', content: '规划生成失败，请检查本地数据或稍后重试。' }]);
    } finally {
      setPlanning(false);
    }
  };

  const addCompletedCourse = () => {
    const code = newCourse.trim().toUpperCase();
    if (!code) return;
    setProfile((prev) => ({
      ...prev,
      completedCourses: Array.from(new Set([...prev.completedCourses, code])),
    }));
    setNewCourse('');
  };

  const loadProfile = async (studentId: string) => {
    const response = await fetch(`/api/profile?student_id=${encodeURIComponent(studentId)}`);
    if (!response.ok) throw new Error('Profile not found');

    const data = await response.json();
      const loadedProfile: Profile = {
      name: data.name || data.student_id || studentId,
      major: data.major || '',
      year: data.year || '',
      completedCourses: data.completed_courses || [],
    };

    setProfile(loadedProfile);
    setPlan(null);
    setSchedule([]);
    setAcademicPlan(null);
    setMessages([
      {
        role: 'assistant',
        content: `欢迎回来，${loadedProfile.name}。我已经从 profile 数据源读取你的档案：${loadedProfile.major}，${loadedProfile.year}，已完成/当前课程 ${loadedProfile.completedCourses.join(', ')}。你可以直接生成 Study Away 规划，或问我某门课能不能选。`,
      },
    ]);
    setToolTrace([
      { tool: 'get_student_profile', status: 'called', args: { student_id: studentId } },
      { tool: 'get_student_profile', status: 'completed', summary: `Loaded ${loadedProfile.major} profile` },
    ]);
    window.localStorage.setItem(LOGIN_KEY, 'true');
    window.localStorage.setItem(PROFILE_VERSION_KEY, DEMO_PROFILE_VERSION);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: loadedProfile, schedule: [], plan: null, academicPlan: null }));
    setLoggedIn(true);
  };

  const loginDemo = async () => {
    if (loginId.trim() !== 'yl8888' || loginPassword !== '12345678') {
      setLoginError('用户名或密码不正确。');
      return;
    }

    setLoginError('');
    setLoginLoading(true);
    try {
      await loadProfile(loginId.trim());
    } catch {
      setLoginError('没有找到这个账号对应的 profile。');
    } finally {
      setLoginLoading(false);
    }
  };

  const logoutDemo = () => {
    window.localStorage.removeItem(LOGIN_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(PROFILE_VERSION_KEY);
    setLoggedIn(false);
    setProfile(DEMO_PROFILE);
    setPlan(null);
    setSchedule([]);
    setMessages([]);
  };

  const resetDemoProfile = () => {
    loadProfile(loginId.trim()).catch(() => {
      setMessages([{ role: 'assistant', content: '没有找到这个账号对应的 profile。' }]);
    });
  };

  const generateAcademicCareerPlan = async () => {
    setPlanning(true);
    setToolTrace([
      { tool: 'get_student_profile', status: 'called', args: { student_id: loginId.trim() }, summary: 'Reading student profile' },
      { tool: 'get_major_requirements', status: 'called', summary: 'Loading degree requirements' },
      { tool: 'generate_academic_career_plan', status: 'called', summary: 'Auditing gaps and career tracks' },
    ]);
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'generate_academic_career_plan', params: { student_id: loginId.trim() } }),
      });
      const data = await response.json();
      setAcademicPlan(data);
      setToolTrace([
        { tool: 'get_student_profile', status: 'completed', summary: `Loaded profile for ${data.student?.student_id || loginId}` },
        { tool: 'get_major_requirements', status: 'completed', summary: `Loaded requirements for ${data.student?.normalized_major || 'major'}` },
        { tool: 'generate_academic_career_plan', status: 'completed', summary: `Progress ${data.degree_audit?.progress_percent ?? 0}%` },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `我已经基于 profile、专业要求、已修课程和职业路径工具生成了学术/职业规划。当前毕业要求进度约 ${data.degree_audit?.progress_percent ?? 0}%，缺口课程包括：${data.degree_audit?.missing_courses?.join(', ') || '暂无明显缺口'}。`,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'assistant', content: '学术/职业规划生成失败，请稍后重试。' }]);
    } finally {
      setPlanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      setLoading(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: '正在识别成绩单...' }]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            fileType: file.type,
          }),
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(content);
        const courses = parsed.courses?.map((course: { code: string }) => course.code).filter(Boolean) || [];

        setProfile((prev) => ({
          ...prev,
          completedCourses: Array.from(new Set([...prev.completedCourses, ...courses])),
        }));
        setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: `已识别 ${courses.length} 门课程：${courses.join(', ')}` }]);
      } catch (error) {
        console.error(error);
        setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: '识别失败，请手动输入课程代码。' }]);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1d1d1f' }}>
        <div style={{ width: 'min(420px, calc(100vw - 40px))', background: 'white', borderRadius: '8px', padding: '28px', boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}>
          <div style={{ width: '44px', height: '44px', background: '#57068c', borderRadius: '8px', marginBottom: '18px' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>NYU Academic Agent</h1>
          <p style={{ margin: '8px 0 22px', color: '#666', fontSize: '14px', lineHeight: 1.5 }}>
            登录后，AI 会读取你的学生档案、专业要求、已修课程和 Study Away 规则，生成学术与职业路径规划。
          </p>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <span style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>NYU NetID</span>
            <input value={loginId} onChange={(event) => setLoginId(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '8px', border: '1px solid #e5e5e7', fontSize: '14px' }} />
          </label>
          <label style={{ display: 'block', marginBottom: '18px' }}>
            <span style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Password</span>
            <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '8px', border: '1px solid #e5e5e7', fontSize: '14px' }} />
          </label>

          {loginError && <div style={{ marginBottom: '14px', color: '#b00020', fontSize: '13px' }}>{loginError}</div>}

          <button onClick={loginDemo} disabled={loginLoading} style={{ ...primaryButtonStyle, width: '100%', opacity: loginLoading ? 0.65 : 1 }}>
            {loginLoading ? 'Loading profile...' : 'Sign in'}
          </button>
          <div style={{ marginTop: '14px', color: '#666', fontSize: '12px', lineHeight: 1.5 }}>
            Demo profile: yl8888, Data Science AI Concentration, Class of 2028.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f7', color: '#1d1d1f' }}>
      <aside style={{ width: '250px', minWidth: '220px', background: 'white', borderRight: '1px solid #e5e5e7', padding: '20px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <div style={{ width: '40px', height: '40px', background: '#57068c', borderRadius: '8px' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>NYU SHANGHAI</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Academic & Career Agent</div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{profile.name || '未设置姓名'}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{profile.year || '未设置年级'}</div>
          <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f0f0f0', borderRadius: '6px', fontSize: '13px', color: '#57068c' }}>
            {profile.major || '未设置专业'}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('plan')} style={navButtonStyle(activeTab === 'plan')}>
            📅 AI 规划
          </button>
          <button onClick={() => setActiveTab('courses')} style={navButtonStyle(activeTab === 'courses')}>
            📚 学生档案
          </button>
          <button onClick={() => setActiveTab('community')} style={navButtonStyle(activeTab === 'community')}>
            💬 社区评价
          </button>
        </nav>

        <div style={{ marginTop: '30px', padding: '12px', background: '#f0f0f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>数据底座</div>
          <DataDot label="学生 Profile" />
          <DataDot label="课程库" />
          <DataDot label="等价课程" />
          <DataDot label="专业要求" />
          <DataDot label="Study Away 规则" />
        </div>

        <button onClick={logoutDemo} style={{ ...secondaryButtonStyle, width: '100%', marginTop: '16px' }}>
          退出 demo
        </button>
        <button onClick={resetDemoProfile} style={{ ...secondaryButtonStyle, width: '100%', marginTop: '8px' }}>
          重载 demo profile
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ padding: '20px 30px', background: 'white', borderBottom: '1px solid #e5e5e7' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>AI 原生学术与职业规划 Agent</h1>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#666' }}>
            AI 通过 tools 读取 profile、专业要求、课程数据、Study Away 规则和职业路径，生成个性化学术规划。
          </p>
        </header>

        <section style={{ flex: 1, overflow: 'auto', padding: '30px' }}>
          {activeTab === 'plan' && (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={generateDataPlan} disabled={planning} style={{ ...primaryButtonStyle, opacity: planning ? 0.65 : 1 }}>
                  {planning ? '正在生成...' : '用数据生成 Study Away 规划'}
                </button>
                <button onClick={generateAcademicCareerPlan} disabled={planning} style={{ ...primaryButtonStyle, opacity: planning ? 0.65 : 1 }}>
                  AI 生成学术/职业路径
                </button>
                <button
                  onClick={() => sendMessage('请调用工具读取我的 profile，并生成一个面向 DS AI concentration 的毕业、选课、Study Away 和职业准备规划。')}
                  style={secondaryButtonStyle}
                >
                  让 AI Agent 解释
                </button>
                <button
                  onClick={() => {
                    setPlan(null);
                    setSchedule([]);
                  }}
                  style={secondaryButtonStyle}
                >
                  清空规划
                </button>
              </div>

              {plan && <PlanPanel plan={plan} />}
              {academicPlan && <AcademicPlanPanel plan={academicPlan} />}

              <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, minmax(120px, 1fr))', gap: '1px', background: '#e5e5e7', overflowX: 'auto' }}>
                  <div style={gridHeaderStyle} />
                  {DAYS.map((day) => (
                    <div key={day.key} style={gridHeaderStyle}>
                      {day.key} {day.label}
                    </div>
                  ))}

                  {TIMES.map((time) => (
                    <React.Fragment key={time}>
                      <div style={{ ...gridCellStyle, fontSize: '13px', color: '#666' }}>{time}</div>
                      {DAYS.map((day) => {
                        const course = schedule.find((item) => item.day === day.key && item.startHour === gridHour(time));
                        return (
                          <div key={`${time}-${day.key}`} style={{ ...gridCellStyle, background: course ? '#eadcf4' : 'white', minHeight: '64px' }}>
                            {course && (
                              <>
                                <div style={{ fontWeight: 600, color: '#57068c' }}>{course.course}</div>
                                <div style={{ fontSize: '11px', color: '#666' }}>{course.room}</div>
                                <div style={{ fontSize: '11px', color: '#666' }}>{course.time}</div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'courses' && (
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>学生档案</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '15px', marginBottom: '24px' }}>
                <ProfileField label="姓名" value={profile.name} placeholder="输入姓名" onChange={(name) => setProfile({ ...profile, name })} />
                <ProfileField label="年级" value={profile.year} placeholder="例如：Class of 2026" onChange={(year) => setProfile({ ...profile, year })} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <ProfileField label="专业" value={profile.major} placeholder="例如：Computer Science" onChange={(major) => setProfile({ ...profile, major })} />
                </div>
              </div>

              <h2 style={{ fontSize: '18px' }}>已完成课程 ({profile.completedCourses.length})</h2>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={newCourse}
                  onChange={(event) => setNewCourse(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && addCompletedCourse()}
                  placeholder="例如 CSCI-SHU 210"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e7' }}
                />
                <button onClick={addCompletedCourse} style={primaryButtonStyle}>添加</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {profile.completedCourses.map((course, index) => (
                  <div key={`${course}-${index}`} style={{ padding: '8px 12px', background: '#f0f0f0', borderRadius: '6px', fontSize: '13px' }}>
                    {course}
                    <button
                      onClick={() => setProfile({ ...profile, completedCourses: profile.completedCourses.filter((_, itemIndex) => itemIndex !== index) })}
                      style={{ marginLeft: '8px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                      aria-label={`删除 ${course}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              <label htmlFor="file-upload" style={{ ...secondaryButtonStyle, display: 'inline-block' }}>
                上传成绩单图片 (JPG/PNG)
              </label>
              <input id="file-upload" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </div>
          )}

          {activeTab === 'community' && (
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginTop: 0, fontSize: '18px' }}>💬 社区评价</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                查看学长学姐的真实课程体验和建议
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="搜索课程评价，例如：CSCI-UA 480"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e7' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = (e.target as HTMLInputElement).value;
                      if (query.trim()) {
                        sendMessage(`查询${query}的社区评价`);
                      }
                    }
                  }}
                />
                <button
                  onClick={() => sendMessage('给我看看CSCI-UA 480的社区评价')}
                  style={secondaryButtonStyle}
                >
                  示例查询
                </button>
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '3px solid #57068c' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>CSCI-UA 480 (Machine Learning)</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        ⭐ 4.3/5 | 难度 4.5/5 | 推荐率 66.7%
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                    "Machine Learning这门课真的很有挑战性，但收获巨大。Ernest Davis教授讲课很清晰，但作业需要花很多时间。建议有扎实的数学基础再来上。"
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                    张三 (Class of 2027) | Fall 2025 | 👍 23人觉得有帮助
                  </div>
                </div>

                <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '3px solid #34c759' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>CSCI-UA 467 (NLP)</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        ⭐ 4.3/5 | 难度 3.5/5 | 推荐率 100%
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                    "NLP课程内容很前沿，涵盖了Transformer、BERT等最新技术。相比ML和CV，这门课难度适中，适合想入门NLP的同学。"
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                    赵六 (Class of 2026) | Spring 2025 | 👍 12人觉得有帮助
                  </div>
                </div>

                <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>💡 Study Away 建议</div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                    "Study Away学生优先级最低，热门课（ML、CV）很难选上。建议提前准备备选方案，或者选择竞争不那么激烈的课程（如NLP、Game Theory）。"
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                    李明 (Class of 2026) | 👍 28人觉得有帮助
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>💬 想查看更多评价？</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                  在聊天框输入：
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
                    "CSCI-UA 480这门课怎么样？"
                  </div>
                  <div style={{ padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
                    "纽约有什么有意思的课？"
                  </div>
                  <div style={{ padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
                    "机器学习难不难？"
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <div
        onMouseDown={() => setResizingChat(true)}
        title="Drag to resize"
        style={{
          width: '8px',
          cursor: 'col-resize',
          background: resizingChat ? '#eadcf4' : 'transparent',
          borderLeft: '1px solid #e5e5e7',
          borderRight: '1px solid #e5e5e7',
          flex: '0 0 auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '42px',
            borderRadius: '999px',
            background: resizingChat ? '#57068c' : '#c8c8ce',
          }}
        />
      </div>

      <aside style={{ width: `${chatWidth}px`, minWidth: '320px', maxWidth: '720px', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'auto', flex: '0 0 auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e5e7' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>AI Assistant</h2>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: '15px',
                maxWidth: '85%',
                marginLeft: message.role === 'user' ? 'auto' : 0,
              }}
            >
              {message.role === 'user' ? (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#57068c',
                    color: 'white',
                    fontSize: '14px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.content}
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'white',
                    border: '1px solid #e5e5e7',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: '#333',
                  }}
                >
                  <FormattedMessage content={message.content} />
                </div>
              )}
            </div>
          ))}
          {loading && <div style={{ color: '#999', fontSize: '14px' }}>AI 正在思考...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #e5e5e7' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              placeholder="问我某门课能不能选、为什么推荐、下一步怎么注册..."
              style={{ flex: 1, padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e5e5e7', minWidth: 0 }}
            />
            <button onClick={() => sendMessage()} disabled={loading} style={{ ...primaryButtonStyle, opacity: loading ? 0.65 : 1 }}>
              发送
            </button>
          </div>
        </div>
      </aside>

      <AgentActivityPanel trace={toolTrace} active={loading || planning} minimized={agentPanelMinimized} onToggleMinimize={() => setAgentPanelMinimized(!agentPanelMinimized)} />
    </div>
  );
}

function DataDot({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', color: '#444' }}>
      <span style={{ width: '8px', height: '8px', background: '#34c759', borderRadius: '50%' }} />
      {label}
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  // Split by sections
  const sections = content.split(/\n\n+/);

  return (
    <div>
      {sections.map((section, idx) => {
        // Check if it's a header with ## or ###
        if (/^##\s+/.test(section)) {
          const title = section.replace(/^##\s+/, '').split('\n')[0];
          const body = section.split('\n').slice(1).join('\n');
          return (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#1d1d1f',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '2px solid #e5e5e7'
              }}>
                {title}
              </div>
              {body && <FormattedMessage content={body} />}
            </div>
          );
        }

        // Check if it's a list with emoji bullets
        if (/^[✅⚠️💡📚📊🔧❌⭐👍🎯]/m.test(section)) {
          const lines = section.split('\n').filter(line => line.trim());
          return (
            <div key={idx} style={{ marginBottom: '16px' }}>
              {lines.map((line, lineIdx) => {
                const match = line.match(/^([✅⚠️💡📚📊🔧❌⭐👍🎯])\s*(.+)/);
                if (match) {
                  const [, emoji, text] = match;
                  const isWarning = emoji === '⚠️';
                  const isSuccess = emoji === '✅';
                  const isTip = emoji === '💡';
                  const isTarget = emoji === '🎯';

                  return (
                    <div
                      key={lineIdx}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px 14px',
                        marginBottom: '8px',
                        borderRadius: '8px',
                        background: isWarning ? '#fff8e1' : isSuccess ? '#e8f5e9' : isTip ? '#e3f2fd' : isTarget ? '#f3e5f5' : '#f5f5f5',
                        border: `1px solid ${isWarning ? '#ffd54f' : isSuccess ? '#81c784' : isTip ? '#64b5f6' : isTarget ? '#ba68c8' : '#e0e0e0'}`,
                      }}
                    >
                      <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                      <div style={{ flex: 1, fontSize: '14px', lineHeight: 1.6, color: '#333' }}>
                        <FormattedText text={text} />
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        }

        // Check if it's a table (contains |)
        if (section.includes('|') && section.split('\n').filter(l => l.includes('|')).length > 2) {
          const lines = section.split('\n').filter(l => l.trim());
          const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
          const rows = lines.slice(2).map(line =>
            line.split('|').map(cell => cell.trim()).filter(Boolean)
          );

          return (
            <div key={idx} style={{ marginBottom: '16px', overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {headers.map((header, i) => (
                      <th key={i} style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        borderBottom: '2px solid #e0e0e0',
                        color: '#57068c'
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '10px 12px', color: '#333' }}>
                          <FormattedText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Check if it's a header with 【】
        if (/^【.+】/.test(section)) {
          const lines = section.split('\n');
          const header = lines[0].replace(/【(.+)】/, '$1');
          const body = lines.slice(1).join('\n');

          return (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{
                fontWeight: 700,
                fontSize: '15px',
                color: '#57068c',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  width: '4px',
                  height: '16px',
                  background: '#57068c',
                  borderRadius: '2px'
                }} />
                {header}
              </div>
              <div style={{ paddingLeft: '16px' }}>
                <FormattedText text={body} />
              </div>
            </div>
          );
        }

        // Check if it's a code block (starts with ```)
        if (section.startsWith('```')) {
          const code = section.replace(/```\w*\n?/, '').replace(/```$/, '');
          return (
            <pre key={idx} style={{
              background: '#f5f5f5',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.5,
              overflowX: 'auto',
              marginBottom: '16px',
              border: '1px solid #e0e0e0',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'
            }}>
              <code>{code}</code>
            </pre>
          );
        }

        // Check if it's a list (starts with - or 1.)
        if (/^[-•]\s+/m.test(section) || /^\d+\.\s+/m.test(section)) {
          const lines = section.split('\n').filter(line => line.trim());
          return (
            <ul key={idx} style={{
              margin: '0 0 16px 0',
              paddingLeft: '24px',
              listStyle: 'none'
            }}>
              {lines.map((line, i) => {
                const text = line.replace(/^[-•]\s+/, '').replace(/^\d+\.\s+/, '');
                return (
                  <li key={i} style={{
                    marginBottom: '8px',
                    paddingLeft: '8px',
                    position: 'relative',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#333'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '-16px',
                      color: '#57068c',
                      fontWeight: 600
                    }}>•</span>
                    <FormattedText text={text} />
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <div key={idx} style={{
            marginBottom: idx < sections.length - 1 ? '12px' : 0,
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#333'
          }}>
            <FormattedText text={section} />
          </div>
        );
      })}
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  // Split by lines for better formatting
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        if (!line.trim()) return <br key={idx} />;

        // Handle list items (- or •)
        if (/^[-•]\s+/.test(line)) {
          const content = line.replace(/^[-•]\s+/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', paddingLeft: '8px' }}>
              <span style={{ color: '#57068c', fontWeight: 'bold' }}>•</span>
              <span style={{ flex: 1 }}><FormattedInlineText text={content} /></span>
            </div>
          );
        }

        // Regular line
        return (
          <div key={idx} style={{ marginBottom: idx < lines.length - 1 ? '6px' : 0 }}>
            <FormattedInlineText text={line} />
          </div>
        );
      })}
    </>
  );
}

function FormattedInlineText({ text }: { text: string }) {
  // Handle bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} style={{ fontWeight: 600, color: '#1d1d1f' }}>{part.slice(2, -2)}</strong>;
        }
        // Handle course codes (CSCI-UA 480)
        if (/[A-Z]{2,5}-[A-Z]{2,4}\s*\d+/.test(part)) {
          return (
            <code key={idx} style={{
              padding: '2px 6px',
              background: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace',
              color: '#57068c',
              fontWeight: 500
            }}>
              {part}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    get_student_profile: 'Reading student profile',
    generate_personalized_schedule: 'Building personalized schedule',
    find_requirement_courses: 'Searching requirement courses',
    generate_academic_career_plan: 'Auditing academic and career path',
    get_major_requirements: 'Loading major requirements',
    get_study_away_rules: 'Checking Study Away rules',
    search_courses: 'Searching course catalog',
    agent_reasoning: 'Planning tool calls',
  };
  return labels[tool] || tool.replace(/_/g, ' ');
}

function statusLabel(item: ToolTraceItem, active: boolean) {
  if (item.status === 'failed') return 'needs review';
  if (item.status === 'completed') return 'done';
  if (active) return 'working';
  return 'queued';
}

function AgentActivityPanel({ trace, active, minimized, onToggleMinimize }: { trace: ToolTraceItem[]; active: boolean; minimized: boolean; onToggleMinimize: () => void }) {
  if (!trace.length) return null;

  // Group by iteration
  const iterations = trace.reduce((acc, item) => {
    const iter = item.iteration || 0;
    if (!acc[iter]) acc[iter] = [];
    acc[iter].push(item);
    return acc;
  }, {} as Record<number, ToolTraceItem[]>);

  const iterationNumbers = Object.keys(iterations).map(Number).sort((a, b) => b - a);
  const visibleIterations = iterationNumbers.slice(0, 3); // Show last 3 iterations

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: '18px',
          bottom: '18px',
          width: '200px',
          background: 'rgba(255,255,255,0.98)',
          border: '1px solid #e2e2e6',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          zIndex: 20,
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
        }}
        onClick={onToggleMinimize}
      >
        <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>🤖 AI Agent</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
              {active ? '思考中...' : `${iterationNumbers.length} iterations`}
            </div>
          </div>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: active ? '#34c759' : '#999',
              boxShadow: active ? '0 0 0 6px rgba(52,199,89,0.2)' : 'none',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '18px',
        bottom: '18px',
        width: '380px',
        maxWidth: 'calc(100vw - 36px)',
        maxHeight: '450px',
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #e2e2e6',
        borderRadius: '12px',
        boxShadow: '0 14px 35px rgba(0,0,0,0.16)',
        overflow: 'hidden',
        zIndex: 20,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e8e8ec', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>🤖 AI Agent 推理</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
            {active ? 'AI正在思考...' : `完成 ${trace.length} 步`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: active ? '#34c759' : '#999',
              boxShadow: active ? '0 0 0 5px rgba(52,199,89,0.2)' : 'none',
            }}
          />
          <button
            onClick={onToggleMinimize}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              lineHeight: 1,
            }}
          >
            −
          </button>
        </div>
      </div>

      <div style={{ padding: '10px', display: 'grid', gap: '10px', maxHeight: '350px', overflow: 'auto' }}>
        {visibleIterations.map((iterNum) => {
          const items = iterations[iterNum];
          const thinkingItem = items.find(item => item.thinking && item.status === 'called');
          const completedItem = items.find(item => item.status === 'completed');

          return (
            <div key={iterNum} style={{ padding: '10px', background: '#f9f9fb', borderRadius: '8px', border: '1px solid #e8e8ec' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#999', marginBottom: '6px' }}>
                [Iteration {iterNum}]
              </div>

              {thinkingItem?.thinking && (
                <div style={{ marginBottom: '6px', padding: '6px 8px', background: 'white', borderRadius: '6px', borderLeft: '3px solid #667eea' }}>
                  <div style={{ fontSize: '12px', color: '#333', lineHeight: 1.4 }}>
                    {thinkingItem.thinking}
                  </div>
                </div>
              )}

              {thinkingItem && (
                <div style={{ display: 'flex', alignItems: 'start', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', marginTop: '1px' }}>🔧</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#26232a' }}>
                      {toolLabel(thinkingItem.tool)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: active && !completedItem ? '#fff3cd' : '#d4edda',
                    color: active && !completedItem ? '#856404' : '#155724',
                    fontWeight: 600,
                  }}>
                    {active && !completedItem ? 'working' : 'done'}
                  </span>
                </div>
              )}

              {completedItem?.result && (
                <div style={{ marginTop: '4px', padding: '4px 6px', background: 'white', borderRadius: '4px', borderLeft: '2px solid #34c759' }}>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    📊 {typeof completedItem.result === 'object' ?
                      `返回 ${Object.keys(completedItem.result).length} 个字段` :
                      '执行完成'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #ededf0', background: '#fafafa', color: '#777', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <span>ReAct: 推理 → 行动 → 反思</span>
        <span>{iterationNumbers.length} iterations</span>
      </div>
    </div>
  );
}

function ToolTracePanel({ trace }: { trace: ToolTraceItem[] }) {
  return (
    <div style={{ marginTop: '18px', border: '1px solid #e5e5e7', borderRadius: '8px', overflow: 'hidden', background: '#fbfbfc' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e5e7', fontWeight: 700, fontSize: '13px' }}>
        Tool Trace
      </div>
      <div style={{ padding: '10px 12px', display: 'grid', gap: '8px' }}>
        {trace.map((item, index) => (
          <div key={`${item.tool}-${index}`} style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <code style={{ color: '#57068c', fontWeight: 700 }}>{item.tool}</code>
              <span style={{ color: item.status === 'failed' ? '#b00020' : item.status === 'completed' ? '#248a3d' : '#666' }}>
                {item.status}
              </span>
            </div>
            {item.args && (
              <div style={{ color: '#666', overflowWrap: 'anywhere' }}>
                args: {JSON.stringify(item.args)}
              </div>
            )}
            {item.summary && <div style={{ color: '#333' }}>{item.summary}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanPanel({ plan }: { plan: PlanResult }) {
  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ margin: 0, fontSize: '18px' }}>{plan.summary}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px' }}>
        <InfoBox label="注册优先截止" value={plan.rules.priorityDeadline || '未提供'} />
        <InfoBox label="备选课规则" value={plan.rules.backupCourses || '未提供'} />
        <InfoBox label="学分限制" value={plan.rules.creditLimits || '未提供'} />
      </div>

      <h3 style={{ fontSize: '15px', marginTop: '20px' }}>推荐课程</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {plan.selectedCourses.map((course) => (
          <div key={course.code} style={{ border: '1px solid #e5e5e7', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <strong>{course.code}</strong>
              <span style={{ color: '#666', fontSize: '13px' }}>{course.credits} credits</span>
            </div>
            <div style={{ marginTop: '4px', color: '#333' }}>{course.title}</div>
            <div style={{ marginTop: '8px', color: '#57068c', fontSize: '13px' }}>{course.reason}</div>
            <div style={{ marginTop: '8px', color: '#666', fontSize: '13px' }}>{course.registrationRule}</div>
            {course.section && (
              <div style={{ marginTop: '8px', color: '#666', fontSize: '13px' }}>
                Section {course.section.section}: {course.section.time}, {course.section.location}, seats {course.section.seats_available}
              </div>
            )}
            {course.risk && <div style={{ marginTop: '8px', color: '#b25000', fontSize: '13px' }}>{course.risk}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {course.evidence.map((item) => (
                <span key={item} style={{ background: '#f0f0f0', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {plan.missingRequirements.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', marginTop: '20px' }}>仍需关注的上海要求</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {plan.missingRequirements.map((code) => (
              <span key={code} style={{ background: '#fff4d6', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' }}>
                {code}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AcademicPlanPanel({ plan }: { plan: AcademicPlanResult }) {
  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Academic & Career Plan</h2>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: '13px' }}>
            {plan.student.major} · {plan.student.year} · GPA {plan.student.gpa}
          </p>
        </div>
        <div style={{ minWidth: '120px', textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#57068c' }}>{plan.degree_audit.progress_percent}%</div>
          <div style={{ color: '#666', fontSize: '12px' }}>degree progress</div>
        </div>
      </div>

      <h3 style={{ fontSize: '15px', marginTop: '20px' }}>Graduation Gaps</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {(plan.degree_audit.missing_courses.length ? plan.degree_audit.missing_courses : ['No major core gap detected']).map((course) => (
          <span key={course} style={{ background: '#fff4d6', borderRadius: '6px', padding: '6px 8px', fontSize: '13px' }}>
            {course}
          </span>
        ))}
      </div>

      <h3 style={{ fontSize: '15px', marginTop: '20px' }}>Future Semester Roadmap</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {plan.future_semester_plan.map((term) => (
          <div key={term.term} style={{ border: '1px solid #e5e5e7', borderRadius: '8px', padding: '12px' }}>
            <strong>{term.term}</strong>
            <div style={{ color: '#57068c', fontSize: '13px', marginTop: '4px' }}>{term.focus}</div>
            <div style={{ color: '#333', fontSize: '13px', marginTop: '8px' }}>
              Courses: {term.recommended_courses.join(', ') || 'Advisor-confirmed electives'}
            </div>
            <div style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>
              Actions: {term.actions.join(' · ')}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '15px', marginTop: '20px' }}>Career Tracks</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {plan.career_tracks.map((track) => (
          <div key={track.title} style={{ border: '1px solid #e5e5e7', borderRadius: '8px', padding: '12px' }}>
            <strong>{track.title}</strong>
            <div style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>{track.why_it_fits}</div>
            <div style={{ color: '#333', fontSize: '13px', marginTop: '8px' }}>
              {track.preparation.join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f7f7f8', borderRadius: '8px', padding: '10px' }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px' }}>{value}</div>
    </div>
  );
}

function ProfileField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#666' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e5e7', fontSize: '14px' }}
      />
    </label>
  );
}

function navButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '12px 16px',
    background: active ? '#57068c' : 'transparent',
    color: active ? 'white' : '#333',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: 500,
  };
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#57068c',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'white',
  color: '#333',
  border: '1px solid #e5e5e7',
  borderRadius: '8px',
  cursor: 'pointer',
};

const gridHeaderStyle: React.CSSProperties = {
  background: 'white',
  padding: '12px',
  fontWeight: 600,
  textAlign: 'center',
  minWidth: 0,
};

const gridCellStyle: React.CSSProperties = {
  background: 'white',
  padding: '12px',
  fontSize: '12px',
  minWidth: 0,
};
