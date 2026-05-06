import { NextResponse } from 'next/server';
import coursesData from '@/data/courses_complete.json';
import equivalenciesData from '@/data/equivalencies.json';
import majorReqsData from '@/data/shanghai_major_requirements.json';
import rulesData from '@/data/study_away_rules_complete.json';

type Section = {
  section: string;
  instructor: string;
  time: string;
  location: string;
  seats_available: number;
};

type Course = {
  title: string;
  campus: string;
  credits: number;
  prerequisites?: string;
  sections?: Section[];
};

type ScheduleBlock = {
  day: string;
  time: string;
  course: string;
  room: string;
};

type Candidate = {
  code: string;
  title: string;
  credits: number;
  reason: string;
  evidence: string[];
  risk: string | null;
  registrationRule: string;
  section: Section | null;
  schedule: ScheduleBlock[];
};

const courses = coursesData as Record<string, Course>;
const equivalencies = equivalenciesData as Record<string, string>;
const majorReqs = majorReqsData as Record<string, any>;
const rules = rulesData as Record<string, any>;

const dayMap: Record<string, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  R: 'Thu',
  F: 'Fri',
};

function normalizeMajor(major: string) {
  if (major.toLowerCase().includes('data science')) return 'Data Science';
  if (major.toLowerCase().includes('computer science')) return 'Computer Science';
  return major;
}

function expandCompleted(completed: string[]) {
  const expanded = new Set(completed);
  completed.forEach((code) => {
    const equivalent = equivalencies[code];
    if (equivalent) expanded.add(equivalent);
  });
  return Array.from(expanded);
}

function hasCourseOrEquivalent(code: string, completed: string[]) {
  const completedSet = new Set(expandCompleted(completed));
  return completedSet.has(code) || completedSet.has(equivalencies[code]);
}

function getMissingMajorCourses(major: string, completed: string[]) {
  const normalizedMajor = normalizeMajor(major);
  const requirements = majorReqs[normalizedMajor];
  if (!requirements) return [];

  const requiredCodes = [
    ...Object.keys(requirements.declaration_prerequisites || {}),
    ...(requirements.core_courses || []),
    ...(requirements.before_study_away || []),
    ...(requirements.foundational_math || []),
    ...(requirements.core_cs || []),
    ...(requirements.data_analysis || []),
  ];

  return Array.from(new Set(requiredCodes)).filter((code) => !hasCourseOrEquivalent(code, completed));
}

function getPrereqRisk(course: Course, completed: string[]) {
  if (!course.prerequisites || course.prerequisites === 'None') return null;

  const completedWithEquiv = expandCompleted(completed);
  const prereqs = course.prerequisites
    .split(/\s+and\s+|\s+or\s+|,\s*/i)
    .map((item) => item.trim())
    .filter(Boolean);

  const missing = prereqs.filter((prereq) => !completedWithEquiv.some((code) => prereq.includes(code)));
  return missing.length > 0 ? `可能缺少先修：${missing.join(', ')}` : null;
}

function departmentForCourse(code: string) {
  if (code.startsWith('CSCI-UA')) return 'Computer Science (CSCI-UA)';
  if (code.startsWith('DS-UA') || code.startsWith('DS-GA')) return 'Data Science (DS-UA / DS-GA)';
  if (code.startsWith('MATH-UA')) return 'Mathematics (MATH-UA)';
  if (code.startsWith('ECON-UA')) return 'Economics (ECON-UA)';
  if (/^(ACCT|ECON|FINC|INFO|MGMT|MKTG|STAT)-UB/.test(code)) {
    return 'Stern (ACCT-UB, ECON-UB, FINC-UB, INFO-UB, MGMT-UB, MKTG-UB, STAT-UB)';
  }
  return '';
}

function getRegistrationRule(code: string) {
  const department = departmentForCourse(code);
  const departmentRules = department ? rules.departments?.[department] : null;
  const form = departmentRules?.form_required ? `表格/流程：${departmentRules.form_required}` : '请按 GPNYC 指引检查注册流程';
  const prereq = departmentRules?.prerequisites ? `先修规则：${departmentRules.prerequisites}` : '';
  return [department || '未匹配具体院系', form, prereq].filter(Boolean).join('；');
}

function parseSectionTime(section: Section | null, courseCode: string): ScheduleBlock[] {
  if (!section?.time) return [];

  const match = section.time.match(/^([MTWRF]+)\s+(.+)$/);
  if (!match) return [];

  return match[1].split('').map((day) => ({
    day: dayMap[day] || day,
    time: match[2],
    course: courseCode,
    room: section.location,
  }));
}

function sectionMinutes(time: string) {
  const match = time.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!match) return null;

  const [, startHour, startMinute, endHour, endMinute, meridiem] = match;
  const to24 = (hourText: string) => {
    let hour = Number(hourText);
    const upper = meridiem.toUpperCase();
    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;
    return hour;
  };

  return {
    start: to24(startHour) * 60 + Number(startMinute),
    end: to24(endHour) * 60 + Number(endMinute),
  };
}

function conflicts(existing: Candidate[], next: Candidate) {
  for (const current of existing) {
    for (const a of current.schedule) {
      for (const b of next.schedule) {
        if (a.day !== b.day) continue;

        const aMinutes = sectionMinutes(a.time);
        const bMinutes = sectionMinutes(b.time);
        if (!aMinutes || !bMinutes) continue;
        if (aMinutes.start < bMinutes.end && bMinutes.start < aMinutes.end) return true;
      }
    }
  }
  return false;
}

function makeCandidate(code: string, reason: string, evidence: string[], completedCourses: string[]) {
  const course = courses[code];
  if (!course) return null;

  const openSection = course.sections?.find((section) => section.seats_available > 0) || course.sections?.[0] || null;

  return {
    code,
    title: course.title,
    credits: course.credits,
    reason,
    evidence,
    risk: getPrereqRisk(course, completedCourses),
    registrationRule: getRegistrationRule(code),
    section: openSection,
    schedule: parseSectionTime(openSection, code),
  };
}

function buildCandidates(major: string, completedCourses: string[]) {
  const normalizedMajor = normalizeMajor(major);
  const missing = getMissingMajorCourses(normalizedMajor, completedCourses);
  const candidates: Candidate[] = [];

  missing.forEach((shanghaiCode) => {
    const newYorkCode = equivalencies[shanghaiCode];
    if (!newYorkCode) return;

    const candidate = makeCandidate(
      newYorkCode,
      `可替代上海要求 ${shanghaiCode}`,
      ['专业要求数据', '上海-纽约等价课程表', '纽约课程数据', 'Study Away 注册规则'],
      completedCourses,
    );
    if (candidate) candidates.push(candidate);
  });

  if (candidates.length < 8) {
    Object.entries(courses)
      .filter(([code, course]) => course.campus === 'New York' && code.startsWith('CSCI-UA') && !hasCourseOrEquivalent(code, completedCourses))
      .slice(0, 30)
      .forEach(([code]) => {
        const candidate = makeCandidate(
          code,
          major ? `${major} 相关纽约课程` : '纽约校区可选课程',
          ['纽约课程数据', 'Study Away 注册规则'],
          completedCourses,
        );
        if (candidate) candidates.push(candidate);
      });
  }

  return candidates;
}

export async function POST(request: Request) {
  const profile = await request.json();
  const completedCourses = profile.completedCourses || [];
  const candidates = buildCandidates(profile.major || '', completedCourses);

  const selected: Candidate[] = [];
  for (const candidate of candidates) {
    if (selected.length >= 4) break;
    if (candidate.risk) continue;
    if (conflicts(selected, candidate)) continue;
    selected.push(candidate);
  }

  if (selected.length < 4) {
    for (const candidate of candidates) {
      if (selected.length >= 4) break;
      if (selected.some((item) => item.code === candidate.code)) continue;
      if (conflicts(selected, candidate)) continue;
      selected.push(candidate);
    }
  }

  const schedule = selected.flatMap((candidate) => candidate.schedule);
  const missingRequirements = getMissingMajorCourses(profile.major || '', completedCourses);
  const totalCredits = selected.reduce((sum, candidate) => sum + (candidate.credits || 0), 0);

  return NextResponse.json({
    summary: `${profile.major || '当前专业'} Study Away 初步规划：推荐 ${selected.length} 门课，共 ${totalCredits} 学分。`,
    selectedCourses: selected.map((candidate) => ({
      code: candidate.code,
      title: candidate.title,
      credits: candidate.credits,
      reason: candidate.reason,
      evidence: candidate.evidence,
      risk: candidate.risk,
      registrationRule: candidate.registrationRule,
      section: candidate.section,
    })),
    schedule,
    missingRequirements,
    rules: {
      priorityDeadline: rules.general_rules?.priority_deadline,
      backupCourses: rules.general_rules?.backup_courses,
      creditLimits: rules.credit_limits?.general,
      warnings: rules.important_warnings || [],
    },
    warnings: selected.filter((candidate) => candidate.risk).map((candidate) => `${candidate.code}: ${candidate.risk}`),
  });
}
