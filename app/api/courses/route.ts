import { NextResponse } from 'next/server';
import coursesData from '@/data/courses_complete.json';
import equivalenciesData from '@/data/equivalencies.json';
import rulesData from '@/data/study_away_rules_complete.json';
import majorReqsData from '@/data/shanghai_major_requirements.json';

const courses = coursesData as Record<string, any>;
const equivalencies = equivalenciesData as Record<string, any>;
const rules = rulesData as {
  departments?: Record<string, any>;
};
const majorReqs = majorReqsData as Record<string, any>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const param = searchParams.get('param') || '';

  switch (action) {
    case 'search_courses': {
      const keyword = param.toLowerCase();
      const results = Object.entries(courses)
        .filter(([code, info]) => code.toLowerCase().includes(keyword) || info.title?.toLowerCase().includes(keyword))
        .slice(0, 20)
        .map(([code, info]) => ({ code, title: info.title, credits: info.credits }));
      return NextResponse.json(results);
    }

    case 'get_course':
      return NextResponse.json(courses[param] || {});

    case 'get_equivalent':
      return NextResponse.json({ equivalent: equivalencies[param] || null });

    case 'get_department_rules':
      return NextResponse.json(rules.departments?.[param] || {});

    case 'get_core_courses': {
      const core = majorReqs['Core Curriculum']?.shanghai_courses?.[param];
      return NextResponse.json(core?.courses || []);
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
