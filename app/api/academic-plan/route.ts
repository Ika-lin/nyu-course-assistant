import { NextResponse } from 'next/server';
import studentProfileData from '@/data/student_profile.json';
import majorReqsData from '@/data/shanghai_major_requirements.json';
import equivalenciesData from '@/data/equivalencies.json';

const profiles = [studentProfileData] as Array<Record<string, any>>;
const majorReqs = majorReqsData as Record<string, any>;
const equivalencies = equivalenciesData as Record<string, string>;

function normalizeMajor(major: string) {
  if (major?.toLowerCase().includes('data science')) return 'Data Science';
  if (major?.toLowerCase().includes('computer science')) return 'Computer Science';
  return major;
}

function expandCompleted(completedCourses: string[]) {
  const expanded = new Set(completedCourses);
  completedCourses.forEach((course) => {
    const equivalent = equivalencies[course];
    if (equivalent) expanded.add(equivalent);
  });
  return expanded;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getRequirementAudit(profile: Record<string, any>) {
  const normalizedMajor = normalizeMajor(profile.major);
  const requirements = majorReqs[normalizedMajor] || {};
  const completed = expandCompleted(profile.completed_courses || []);

  const requirementGroups = [
    {
      key: 'foundation',
      label: 'Major foundation',
      courses: unique([
        ...Object.keys(requirements.declaration_prerequisites || {}),
        ...(requirements.foundational_math || []),
      ]),
    },
    {
      key: 'core',
      label: 'Major core',
      courses: unique([...(requirements.core_cs || []), ...(requirements.data_analysis || [])]),
    },
    {
      key: 'study_away_ready',
      label: 'Before Study Away',
      courses: unique(requirements.before_study_away || []),
    },
  ];

  const groups = requirementGroups.map((group) => {
    const completedCourses = group.courses.filter((course) => completed.has(course) || completed.has(equivalencies[course]));
    const missingCourses = group.courses.filter((course) => !completed.has(course) && !completed.has(equivalencies[course]));

    return {
      ...group,
      completed_courses: completedCourses,
      missing_courses: missingCourses,
      progress: group.courses.length ? Math.round((completedCourses.length / group.courses.length) * 100) : 0,
    };
  });

  const allMissing = unique(groups.flatMap((group) => group.missing_courses));
  const totalRequired = unique(groups.flatMap((group) => group.courses)).length;
  const totalCompleted = unique(groups.flatMap((group) => group.completed_courses)).length;

  return {
    normalized_major: normalizedMajor,
    groups,
    missing_courses: allMissing,
    progress: totalRequired ? Math.round((totalCompleted / totalRequired) * 100) : 0,
  };
}

function buildSemesterPlan(missingCourses: string[]) {
  const priority = ['ECON-SHU 301', 'CSCI-SHU 213', 'DATS-SHU 420'];
  const ordered = unique([...priority.filter((course) => missingCourses.includes(course)), ...missingCourses]);

  return [
    {
      term: 'Fall 2026',
      focus: 'Study Away readiness and DS core completion',
      recommended_courses: ordered.slice(0, 3),
      actions: ['Confirm Study Away destination', 'Check prerequisites for DS/CS electives', 'Prepare 1 backup course for every target course'],
    },
    {
      term: 'Spring 2027',
      focus: 'AI concentration depth and project portfolio',
      recommended_courses: ['AI/ML advanced elective', 'Data Science elective', 'Research or project-based course'],
      actions: ['Build one portfolio project around computer vision or machine learning', 'Meet academic advisor for degree audit'],
    },
    {
      term: 'Fall 2027',
      focus: 'Capstone preparation and career positioning',
      recommended_courses: ['Capstone preparation', 'Advanced DS/AI elective', 'Open elective aligned with career goal'],
      actions: ['Prepare internship applications', 'Polish resume and GitHub/portfolio', 'Identify capstone topic'],
    },
    {
      term: 'Spring 2028',
      focus: 'Graduation completion and transition',
      recommended_courses: ['DATS-SHU 420 or approved capstone equivalent', 'Remaining graduation requirement'],
      actions: ['Final degree requirement check', 'Complete capstone', 'Finalize career or graduate school plan'],
    },
  ];
}

function careerTracks(profile: Record<string, any>) {
  const isAi = profile.major?.toLowerCase().includes('ai');

  return [
    {
      title: 'Machine Learning / AI Engineer',
      fit: isAi ? 'Strong fit for DS AI concentration' : 'Good fit with DS core',
      skills: ['Python', 'machine learning', 'deep learning', 'computer vision', 'model evaluation'],
      next_steps: ['Turn Computer Vision or ML coursework into a portfolio project', 'Practice ML system design basics', 'Prepare internship applications'],
    },
    {
      title: 'Data Scientist / Analytics',
      fit: 'Strong fit for Data Science major',
      skills: ['statistics', 'experimentation', 'SQL', 'data storytelling', 'predictive modeling'],
      next_steps: ['Strengthen econometrics/data analysis requirement', 'Create one end-to-end analytics case study', 'Practice behavioral + technical interviews'],
    },
    {
      title: 'Research / Graduate School in AI',
      fit: 'Good fit if GPA and research experience improve',
      skills: ['linear algebra', 'probability', 'research reading', 'experiments', 'technical writing'],
      next_steps: ['Find faculty research or independent study', 'Read papers related to CV/ML', 'Prepare a research-oriented project'],
    },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id') || 'yl8888';
  const profile = profiles.find((item) => item.student_id === studentId);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const audit = getRequirementAudit(profile);

  return NextResponse.json({
    student: {
      student_id: profile.student_id,
      name: profile.name,
      major: profile.major,
      normalized_major: audit.normalized_major,
      year: profile.year,
      gpa: profile.gpa,
      credits_completed: profile.credits_completed,
    },
    audit,
    semester_plan: buildSemesterPlan(audit.missing_courses),
    career_tracks: careerTracks(profile),
    advisor_notes: [
      'Use the degree audit as the source of truth before final registration.',
      'For Study Away, verify prerequisites and department-specific registration rules early.',
      'For AI concentration, prioritize rigorous math, ML/AI electives, and portfolio projects.',
    ],
  });
}
