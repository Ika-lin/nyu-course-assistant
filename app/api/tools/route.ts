import { NextResponse } from 'next/server';
import coursesData from '@/data/courses_complete.json';
import rulesData from '@/data/study_away_rules_complete.json';
import equivalenciesData from '@/data/equivalencies.json';
import satisfyingData from '@/data/satisfying_courses.json';
import studyAwayRequirementCoursesData from '@/data/study_away_requirement_courses.json';
import csEquivalenciesPrereqsData from '@/data/cs_equivalencies_prereqs.json';
import courseScheduleCatalogData from '@/data/course_schedule_catalog.json';
import majorReqsData from '@/data/shanghai_major_requirements.json';
import studentProfileData from '@/data/student_profile.json';
import professorRatingsData from '@/data/professor_ratings.json';
import courseHistoryData from '@/data/course_history.json';
import studyAwayRestrictionsData from '@/data/study_away_restrictions.json';
import courseWorkloadData from '@/data/course_workload.json';
import communityReviewsData from '@/data/community_reviews.json';

type ToolParams = Record<string, any>;

const courses = coursesData as Record<string, any>;
const rules = rulesData as Record<string, any>;
const equivalencies = equivalenciesData as Record<string, string>;
const satisfying = satisfyingData as Record<string, string[]>;
const studyAwayRequirementCourses = studyAwayRequirementCoursesData as Record<string, any>;
const csEquivalenciesPrereqs = csEquivalenciesPrereqsData as Record<string, any>;
const courseScheduleCatalog = courseScheduleCatalogData as Record<string, any>;
const majorReqs = majorReqsData as Record<string, any>;
const studentProfiles = [studentProfileData] as Array<Record<string, any>>;
const professorRatings = professorRatingsData as Record<string, any>;
const courseHistory = courseHistoryData as Record<string, any>;
const studyAwayRestrictions = studyAwayRestrictionsData as Record<string, any>;
const courseWorkload = courseWorkloadData as Record<string, any>;
const communityReviews = communityReviewsData as Record<string, any>;

const requirementAliases: Record<string, string> = {
  sts: 'Science, Technology and Society',
  'science technology society': 'Science, Technology and Society',
  'science, technology and society': 'Science, Technology and Society',
  'ai concentration': 'Data Science Artificial Intelligence Concentration',
  'artificial intelligence concentration': 'Data Science Artificial Intelligence Concentration',
};

function normalizeMajor(major: string) {
  if (major?.toLowerCase().includes('data science')) return 'Data Science';
  if (major?.toLowerCase().includes('computer science')) return 'Computer Science';
  return major;
}

function addEquivalentCourses(completedCourses: string[]) {
  const expanded = new Set(completedCourses);

  completedCourses.forEach((course) => {
    const equivalent = equivalencies[course];
    if (equivalent) expanded.add(equivalent);
  });

  return Array.from(expanded);
}

function missingPrerequisites(prerequisites: string, completedCourses: string[]) {
  const completedWithEquiv = addEquivalentCourses(completedCourses);
  const prereqs = prerequisites.split(/\s+and\s+|\s+or\s+|,\s*/).map((item) => item.trim()).filter(Boolean);

  return prereqs.filter((prereq) => !completedWithEquiv.some((course) => prereq.includes(course)));
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

function normalizeText(value: string) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeRequirementQuery(requirement: string) {
  const normalized = normalizeText(requirement);
  return requirementAliases[normalized] || requirement;
}

function siteMatches(recordSite: string, site?: string) {
  if (!site) return true;
  const query = normalizeText(site);
  const record = normalizeText(recordSite);
  if (query === 'us' || query === 'usa' || query === 'united states' || query === 'america') {
    return ['new york', 'los angeles', 'tulsa', 'washington d c'].includes(record);
  }
  return record.includes(query) || query.includes(record);
}

function sectionFormatMatches(section: any, format?: string) {
  if (!format) return true;
  const query = normalizeText(format);
  const haystack = normalizeText([
    section?.format,
    section?.location,
    section?.time,
    section?.section,
  ].filter(Boolean).join(' '));

  if (['online', 'remote', 'virtual', 'web'].includes(query)) {
    return /(online|remote|virtual|web|zoom)/i.test(haystack);
  }
  return haystack.includes(query);
}

function timeToMinutes(value: string) {
  const [hour, minute] = (value || '00:00').split(':').map(Number);
  return hour * 60 + minute;
}

function parseMeridiemTime(value: string, fallback = '09:00') {
  const match = (value || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return fallback;
  let hour = Number(match[1]);
  const minute = match[2] || '00';
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function normalizeSection(section: any) {
  if (!section?.time || section.days?.length) return section;
  const match = section.time.match(/^([MTWRF]+)\s+(.+?)-(.+)$/i);
  if (!match) return section;
  const [, dayBlob, startText, endText] = match;
  const inferredStart = !/(AM|PM)/i.test(startText) && /PM/i.test(endText)
    ? `${startText}PM`
    : startText;
  return {
    ...section,
    days: dayBlob.toUpperCase().split(''),
    start: parseMeridiemTime(inferredStart),
    end: parseMeridiemTime(endText, parseMeridiemTime(inferredStart)),
  };
}

function sectionsConflict(a: any, b: any) {
  const sharedDay = (a.days || []).some((day: string) => (b.days || []).includes(day));
  if (!sharedDay) return false;
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);
}

function chooseBestSection(course: any, preferences: any, selectedSections: any[]) {
  const preferredFormats = preferences.preferred_formats || [];
  const preferredDays = preferences.preferred_days || [];
  const avoidDays = preferences.avoid_days || [];
  const available = (course.sections || [])
    .filter((section: any) => (section.seats_available ?? 0) > 0)
    .filter((section: any) => !(section.days || []).some((day: string) => avoidDays.includes(day)))
    .filter((section: any) => !selectedSections.some((selected) => sectionsConflict(section, selected)))
    .map((section: any) => {
      const formatRank = preferredFormats.indexOf(section.format);
      const formatScore = formatRank >= 0 ? 12 - formatRank * 2 : 0;
      const onlineScore = normalizeText(section.format).includes('online') ? 2 : 0;
      const dayScore = preferredDays.length && (section.days || []).every((day: string) => preferredDays.includes(day)) ? 10 : 0;
      return {
        section,
        score: formatScore + onlineScore + dayScore + Math.min(section.seats_available || 0, 8),
      };
    })
    .sort((a: any, b: any) => b.score - a.score);

  return available[0]?.section || null;
}

function coursePrereqsSatisfied(course: any, completedCourses: string[]) {
  const completed = new Set(addEquivalentCourses(completedCourses));
  const missing = (course.prerequisites || []).filter((prereq: string) => !completed.has(prereq));
  return {
    satisfied: missing.length === 0,
    missing,
  };
}

function courseOfferingsByCode(term: string): Map<string, any> {
  const offerings = courseScheduleCatalog.terms?.[term] || [];
  return new Map(offerings.map((course: any) => [course.course_code, course]));
}

function reverseEquivalentCourse(code: string) {
  const match = Object.entries(equivalencies).find(([, nyCode]) => nyCode === code);
  return match?.[0] || null;
}

function catalogCourseForCode(code: string, term: string): any | null {
  const offering = courseOfferingsByCode(term).get(code);
  if (offering) return offering;

  const shanghaiEquivalent = reverseEquivalentCourse(code);
  if (shanghaiEquivalent) {
    const shanghaiOffering = courseOfferingsByCode(term).get(shanghaiEquivalent);
    if (shanghaiOffering) return {
      ...shanghaiOffering,
      satisfies_target_prereq: code,
      equivalent_note: `${shanghaiEquivalent} is mapped to ${code}`,
    };
  }

  const course = courses[code];
  if (!course) return null;
  const satisfiesSts = (satisfying['Science, Technology and Society'] || []).includes(code)
    || (studyAwayRequirementCourses.by_course?.[code] || []).some((record: any) => /Science, Technology and Society|STS/i.test(record.core || record.major_requirement_category || ''));
  return {
    course_code: code,
    title: course.title,
    campus: course.campus,
    credits: course.credits,
    prerequisites: course.prerequisites && course.prerequisites !== 'None' ? missingPrerequisites(course.prerequisites, []) : [],
    sections: (course.sections || []).map(normalizeSection),
    requirement_tags: satisfiesSts ? ['Science, Technology and Society'] : [],
    career_tags: [],
    preference_tags: [],
  };
}

function prereqCodesForCourse(course: any) {
  return Array.isArray(course?.prerequisites)
    ? course.prerequisites
    : (course?.prerequisites && course.prerequisites !== 'None'
      ? missingPrerequisites(course.prerequisites, [])
      : []);
}

function selectedSectionForBridge(course: any) {
  return (course.sections || []).find((section: any) => (section.seats_available ?? 0) > 0) || (course.sections || [])[0] || null;
}

function scheduleItemFromCourse(course: any, preferences: any, selectedSections: any[] = []) {
  const prereqStatus = coursePrereqsSatisfied(course, studentProfiles[0]?.completed_courses || []);
  const section = chooseBestSection(course, preferences, selectedSections) || selectedSectionForBridge(course);
  if (!section) return null;
  return {
    course_code: course.course_code,
    title: course.title,
    credits: course.credits,
    campus: course.campus,
    selected_section: section,
    requirement_tags: course.requirement_tags || [],
    career_relevance: course.career_tags || [],
    prerequisite_status: prereqStatus,
    why_selected: [
      'Replaced by student preference',
      (course.requirement_tags || [])[0] ? `Supports ${(course.requirement_tags || [])[0]}` : null,
    ].filter(Boolean),
    score: 999,
  };
}

function courseRequirementMatches(code: string, course: any, profile: any) {
  const normalizedMajor = normalizeMajor(profile.major);
  const majorRequirements = majorReqs[normalizedMajor] || {};
  const completedWithEquiv = new Set(addEquivalentCourses(profile.completed_courses || []));
  const missingMajorCodes = Array.from(new Set([
    ...(majorRequirements.core_cs || []),
    ...(majorRequirements.data_analysis || []),
    ...(majorRequirements.before_study_away || []),
    ...(majorRequirements.foundational_math || []),
  ])).filter((requiredCode: string) => !completedWithEquiv.has(requiredCode) && !completedWithEquiv.has(equivalencies[requiredCode]));

  const tags = [
    ...(course.requirement_tags || []),
    ...(course.career_tags || []),
    ...(course.preference_tags || []),
  ];
  const categories = Object.entries(studyAwayRequirementCourses.by_course || {})
    .filter(([courseCode]) => courseCode === code)
    .flatMap(([, records]: any) => records.map((record: any) => record.major_requirement_category || record.core || record.major_minor).filter(Boolean));

  const satisfiesMissingMajor = missingMajorCodes.some((requiredCode: string) => code === requiredCode || equivalencies[requiredCode] === code);
  const satisfiesCore = tags.some((tag: string) => /Science, Technology and Society|STS|Core/i.test(tag))
    || categories.some((category: string) => /Science, Technology and Society|STS|Core/i.test(category));
  const supportsAi = tags.some((tag: string) => /AI|Machine Learning|ML|Data Scientist|Data Engineer|Responsible AI/i.test(tag))
    || categories.some((category: string) => /Artificial Intelligence|Data Science/i.test(category));

  let priority: 'high' | 'medium' | 'low' = 'low';
  let advisorFit = 'Free elective / low priority for current DS AI graduation gaps';
  const reasons: string[] = [];

  if (satisfiesMissingMajor) {
    priority = 'high';
    advisorFit = 'Major requirement / graduation gap';
    reasons.push('It covers a missing Data Science requirement in your current audit.');
  } else if (satisfiesCore) {
    priority = 'high';
    advisorFit = 'Core Curriculum requirement';
    reasons.push('It can help cover the missing STS/Core requirement.');
  } else if (supportsAi) {
    priority = 'medium';
    advisorFit = 'AI concentration or career-aligned elective';
    reasons.push('It is aligned with your AI/ML career direction, but should be sequenced after required gaps.');
  } else {
    reasons.push('It does not clearly satisfy your current DS AI major gaps or STS/Core gap in the available data.');
  }

  return {
    advisor_fit: advisorFit,
    priority,
    reasons,
    missing_major_gaps: missingMajorCodes,
    matched_requirement_categories: Array.from(new Set(categories)).slice(0, 8),
  };
}

function evaluateCourseAccessWithPlan(params: ToolParams) {
  const profile = studentProfiles.find((item) => item.student_id === params.student_id);
  if (!profile) return { error: 'Profile not found' };

  const term = params.term || 'Fall 2026';
  const targetCode = (params.course_code || '').toUpperCase();
  const targetOffering = catalogCourseForCode(targetCode, term);
  const targetCourse = targetOffering || courses[targetCode];
  if (!targetCourse) return { error: 'Course not found', course_code: targetCode };
  const advisorAssessment = courseRequirementMatches(targetCode, targetCourse, profile);

  const completedWithEquiv = new Set(addEquivalentCourses(profile.completed_courses || []));
  const prereqs = prereqCodesForCourse(targetCourse);
  const missing = prereqs.filter((prereq: string) => !completedWithEquiv.has(prereq));
  const bridgeCourses = missing.map((missingCode: string) => {
    const bridge = catalogCourseForCode(missingCode, term);
    if (!bridge) {
      return {
        missing_prerequisite: missingCode,
        bridge_course_found: false,
        reason: 'No scheduled bridge course found in current catalog',
      };
    }
    const bridgePrereqStatus = coursePrereqsSatisfied(bridge, profile.completed_courses || []);
    return {
      missing_prerequisite: missingCode,
      bridge_course_found: true,
      course_code: bridge.course_code,
      title: bridge.title,
      campus: bridge.campus,
      credits: bridge.credits,
      selected_section: selectedSectionForBridge(bridge),
      prerequisite_status: bridgePrereqStatus,
      equivalent_note: bridge.equivalent_note || null,
      career_relevance: bridge.career_tags || [],
      requirement_tags: bridge.requirement_tags || [],
    };
  });

  const canTakeNow = missing.length === 0;
  const bridgePlan: any[] = [];
  const plannedCompleted = new Set(completedWithEquiv);
  const addBridgeChain = (neededCode: string, depth = 0) => {
    if (depth > 4 || plannedCompleted.has(neededCode)) return;
    const course = catalogCourseForCode(neededCode, term);
    if (!course) return;

    const coursePrereqs = prereqCodesForCourse(course);
    coursePrereqs
      .filter((prereq: string) => !plannedCompleted.has(prereq))
      .forEach((prereq: string) => addBridgeChain(prereq, depth + 1));

    const stillMissing = coursePrereqs.filter((prereq: string) => !plannedCompleted.has(prereq));
    bridgePlan.push({
      course_code: course.course_code,
      title: course.title,
      campus: course.campus,
      credits: course.credits,
      selected_section: selectedSectionForBridge(course),
      prerequisite_status: {
        satisfied_after_prior_steps: stillMissing.length === 0,
        missing_before_prior_steps: stillMissing,
      },
      satisfies: neededCode,
      career_relevance: course.career_tags || [],
      requirement_tags: course.requirement_tags || [],
    });
    plannedCompleted.add(neededCode);
    if (course.equivalent_note && course.satisfies_target_prereq) plannedCompleted.add(course.satisfies_target_prereq);
  };

  missing.forEach((code: string) => addBridgeChain(code));
  return {
    student: {
      student_id: profile.student_id,
      major: profile.major,
      year: profile.year,
    },
    target_course: {
      course_code: targetCode,
      title: targetCourse.title,
      campus: targetCourse.campus,
      credits: targetCourse.credits,
      prerequisites: prereqs,
      sections: targetCourse.sections || [],
    },
    advisor_assessment: advisorAssessment,
    can_take_now: canTakeNow,
    missing_prerequisites: missing,
    completed_courses_with_equivalencies: Array.from(completedWithEquiv),
    bridge_courses: bridgeCourses,
    bridge_plan: bridgePlan,
    recommended_sequence: canTakeNow
      ? [
        {
          term,
          action: `Take ${targetCode}`,
          course_code: targetCode,
          selected_section: selectedSectionForBridge(targetCourse),
        },
      ]
      : [
        {
          term,
          action: 'Take prerequisite bridge course(s) in order',
          courses: bridgePlan,
        },
        {
          term: 'Spring 2027',
          action: `Then take ${targetCode} after prerequisites are completed`,
          course_code: targetCode,
          title: targetCourse.title,
        },
      ],
    advisor_message: canTakeNow
      ? `You can take ${targetCode} now based on completed courses and equivalencies. Advisor priority: ${advisorAssessment.priority}.`
      : `You should not take ${targetCode} yet; complete ${missing.join(', ')} first.`,
    evidence: [
      'student_profile.json',
      'courses_complete.json',
      'equivalencies.json',
      'course_schedule_catalog.json',
    ],
  };
}

function scoreScheduleCourse(course: any, preferences: any, profile: any, prereqStatus: any) {
  const preferredTags = (preferences.preferred_tags || []).map(normalizeText);
  const careerGoal = normalizeText(preferences.career_goal || '');
  const tags = [
    ...(course.preference_tags || []),
    ...(course.career_tags || []),
    ...(course.requirement_tags || []),
  ].map(normalizeText);

  let score = 0;
  tags.forEach((tag) => {
    if (preferredTags.some((preferred: string) => tag.includes(preferred) || preferred.includes(tag))) score += 10;
    if (careerGoal && (tag.includes(careerGoal) || careerGoal.includes(tag))) score += 8;
  });
  if ((course.requirement_tags || []).some((tag: string) => /data science|capstone|study away|sts/i.test(tag))) score += 12;
  if (prereqStatus.satisfied) score += 20;
  if ((course.sections || []).some((section: any) => (section.seats_available || 0) > 0)) score += 6;
  return score;
}

function generatePersonalizedSchedule(params: ToolParams) {
  const profile = studentProfiles.find((item) => item.student_id === params.student_id);
  if (!profile) return { error: 'Profile not found' };

  const term = params.term || 'Fall 2026';
  const targetCampus = params.campus; // "New York" or "Shanghai"
  const allOfferings = courseScheduleCatalog.terms?.[term] || [];

  // Filter by campus if specified
  const offerings = targetCampus
    ? allOfferings.filter((course: any) => course.campus === targetCampus)
    : allOfferings;

  const defaultPreferences = courseScheduleCatalog.default_student_preferences || {};
  const preferences = {
    ...defaultPreferences,
    career_goal: params.career_goal || defaultPreferences.career_goal,
    preferred_formats: params.preferred_formats || defaultPreferences.preferred_formats,
    preferred_tags: params.preferred_tags || defaultPreferences.preferred_tags,
    preferred_days: params.preferred_days || defaultPreferences.preferred_days || [],
    avoid_days: params.avoid_days || defaultPreferences.avoid_days || [],
    max_credits: params.max_credits || defaultPreferences.max_credits || 16,
  };

  const evaluated = offerings.map((course: any) => {
    const prereqStatus = coursePrereqsSatisfied(course, profile.completed_courses || []);
    return {
      ...course,
      prerequisite_status: prereqStatus,
      score: scoreScheduleCourse(course, preferences, profile, prereqStatus),
    };
  }).sort((a: any, b: any) => b.score - a.score);

  const selected: any[] = [];
  const deferred: any[] = [];
  const selectedSections: any[] = [];
  let credits = 0;

  evaluated.forEach((course: any) => {
    if (!course.prerequisite_status.satisfied) {
      deferred.push({
        course_code: course.course_code,
        title: course.title,
        reason: `Missing prerequisite(s): ${course.prerequisite_status.missing.join(', ')}`,
        missing_prerequisites: course.prerequisite_status.missing,
        career_relevance: course.career_tags,
      });
      return;
    }
    if (credits + course.credits > preferences.max_credits) {
      deferred.push({
        course_code: course.course_code,
        title: course.title,
        reason: `Would exceed ${preferences.max_credits} credit preference`,
        career_relevance: course.career_tags,
      });
      return;
    }

    const section = chooseBestSection(course, preferences, selectedSections);
    if (!section) {
      deferred.push({
        course_code: course.course_code,
        title: course.title,
        reason: 'No open non-conflicting section that matches the current day/time preferences',
        career_relevance: course.career_tags,
      });
      return;
    }

    selected.push({
      course_code: course.course_code,
      title: course.title,
      credits: course.credits,
      campus: course.campus,
      selected_section: section,
      requirement_tags: course.requirement_tags,
      career_relevance: course.career_tags,
      why_selected: [
        course.requirement_tags?.[0] ? `Supports ${course.requirement_tags[0]}` : null,
        course.career_tags?.[0] ? `Aligned with ${course.career_tags[0]}` : null,
        section.format ? `${section.format} format fits preferences` : null,
      ].filter(Boolean),
      score: course.score,
    });
    selectedSections.push(section);
    credits += course.credits;
  });

  return {
    student: {
      student_id: profile.student_id,
      major: profile.major,
      year: profile.year,
      credits_completed: profile.credits_completed,
    },
    term,
    preferences,
    schedule: selected,
    total_credits: credits,
    deferred_courses: deferred,
    future_plan: [
      {
        term: 'Fall 2026',
        focus: 'Take only courses whose prerequisites are already satisfied',
        courses: selected.map((item) => item.course_code),
      },
      {
        term: 'Spring 2027',
        focus: 'After CSCI-UA 201 is completed, take Basic Algorithms as the bridge into advanced AI/ML',
        courses: deferred.some((item) => item.course_code === 'CSCI-UA 310') ? ['CSCI-UA 310'] : [],
      },
      {
        term: 'Fall 2027',
        focus: 'After Basic Algorithms is completed, take advanced Machine Learning / AI electives',
        courses: deferred.some((item) => item.course_code === 'CSCI-UA 473') ? ['CSCI-UA 473'] : [],
      },
    ].filter((item) => item.courses.length),
    career_plan: {
      target: preferences.career_goal,
      next_steps: [
        'Use Databases/Econometrics to strengthen data foundations.',
        'Use ML/AI or AI ethics courses to connect technical work with responsible AI positioning.',
        'Build one portfolio project from the semester schedule and document it for internship applications.',
      ],
    },
    evidence: [
      'student_profile.json',
      'course_schedule_catalog.json',
      'shanghai_major_requirements.json',
      'equivalencies.json',
      'cs_equivalencies_prereqs.json',
    ],
  };
}

function listAvailableCourses(params: ToolParams) {
  const profile = studentProfiles.find((item) => item.student_id === params.student_id);
  if (!profile) return { error: 'Profile not found' };

  const term = params.term || 'Fall 2026';
  const offerings = courseScheduleCatalog.terms?.[term] || [];
  const available: any[] = [];
  const notAvailable: any[] = [];

  offerings.forEach((course: any) => {
    const prereqStatus = coursePrereqsSatisfied(course, profile.completed_courses || []);
    const openSections = (course.sections || []).filter((section: any) => (section.seats_available ?? 0) > 0);
    const assessment = courseRequirementMatches(course.course_code, course, profile);
    const item = {
      course_code: course.course_code,
      title: course.title,
      campus: course.campus,
      credits: course.credits,
      requirement_tags: course.requirement_tags || [],
      career_relevance: course.career_tags || [],
      prerequisites: course.prerequisites || [],
      open_sections: openSections,
      advisor_priority: assessment.priority,
      advisor_fit: assessment.advisor_fit,
      advisor_reasons: assessment.reasons,
      can_take_now: prereqStatus.satisfied && openSections.length > 0,
      missing_prerequisites: prereqStatus.missing,
      reason: prereqStatus.satisfied
        ? (openSections.length ? 'Prerequisites satisfied and open sections exist' : 'Prerequisites satisfied, but no open section')
        : `Missing prerequisite(s): ${prereqStatus.missing.join(', ')}`,
    };
    if (item.can_take_now) available.push(item);
    else notAvailable.push(item);
  });

  const sortedAvailable = available.sort((a, b) => {
    const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (rank[b.advisor_priority] || 0) - (rank[a.advisor_priority] || 0);
  });

  // If too many courses, suggest user to narrow down
  const tooMany = sortedAvailable.length > 30;

  return {
    student: {
      student_id: profile.student_id,
      major: profile.major,
      year: profile.year,
      credits_completed: profile.credits_completed,
    },
    term,
    total_available: sortedAvailable.length,
    total_unavailable: notAvailable.length,
    available_courses: tooMany ? sortedAvailable.slice(0, 20) : sortedAvailable,
    unavailable_courses: tooMany ? [] : notAvailable,
    warning: tooMany ? `发现${sortedAvailable.length}门可选课程，结果过多。建议用户细化需求，例如："帮我找CS专业的课"、"推荐难度适中的课"、"只看下午的课"等。当前只显示前20门高优先级课程。` : null,
    recommended_next_step: tooMany
      ? '结果太多了！建议让用户细化需求（按专业、难度、时间、兴趣等筛选），或者直接问"帮我生成课表"让AI自动选择最合适的课程。'
      : 'Ask me to generate a timetable only after you choose priorities, preferred days/formats, or confirm you want the advisor-recommended schedule.',
    evidence: [
      'student_profile.json',
      'course_schedule_catalog.json',
      'equivalencies.json',
      'shanghai_major_requirements.json',
    ],
  };
}

function replaceScheduleCourse(params: ToolParams) {
  const studentId = params.student_id || 'yl8888';
  const term = params.term || 'Fall 2026';
  const targetCode = (params.target_course_code || '').toUpperCase();
  const removeCode = (params.remove_course_code || '').toUpperCase();
  const baseSchedule = generatePersonalizedSchedule({ ...params, student_id: studentId, term });
  if (baseSchedule.error) return baseSchedule;

  const targetCourse = catalogCourseForCode(targetCode, term);
  if (!targetCourse) return { error: 'Replacement course not found in course data', course_code: targetCode };

  const selectedSections = (baseSchedule.schedule || [])
    .filter((item: any) => item.course_code !== removeCode)
    .map((item: any) => item.selected_section)
    .filter(Boolean);
  const replacement = scheduleItemFromCourse(targetCourse, baseSchedule.preferences || {}, selectedSections);
  if (!replacement) return { error: 'Replacement course has no available section', course_code: targetCode };

  const targetTags = [
    ...(targetCourse.requirement_tags || []),
    ...(targetCourse.career_tags || []),
  ].join(' ');
  const targetIsSts = /Science, Technology and Society|STS/i.test(targetTags)
    || (satisfying['Science, Technology and Society'] || []).includes(targetCode)
    || (studyAwayRequirementCourses.by_course?.[targetCode] || []).some((record: any) => /Science, Technology and Society|STS/i.test(record.core || record.major_requirement_category || ''));
  const replaceIndex = (baseSchedule.schedule || []).findIndex((item: any) => {
    if (removeCode && item.course_code === removeCode) return true;
    const tags = [
      ...(item.requirement_tags || []),
      ...(item.career_relevance || []),
    ].join(' ');
    return targetIsSts && /Science, Technology and Society|STS/i.test(tags);
  });

  const schedule = [...(baseSchedule.schedule || [])];
  if (replaceIndex >= 0) schedule.splice(replaceIndex, 1, replacement);
  else schedule.push(replacement);

  const uniqueSchedule = schedule.filter((item, index, array) => (
    array.findIndex((candidate) => candidate.course_code === item.course_code) === index
  ));

  return {
    ...baseSchedule,
    schedule: uniqueSchedule,
    total_credits: uniqueSchedule.reduce((sum: number, item: any) => sum + (item.credits || 0), 0),
    replacement: {
      removed_course_code: replaceIndex >= 0 ? (baseSchedule.schedule || [])[replaceIndex]?.course_code : null,
      target_course_code: targetCode,
      reason: 'Student asked to update the recommended timetable',
    },
  };
}

function findRequirementCourses(params: ToolParams) {
  const requirement = normalizeRequirementQuery(params.requirement || '');
  const requirementNeedle = normalizeText(requirement);
  const records = (studyAwayRequirementCourses.records || []) as any[];
  const matchedRecords = records.filter((record) => {
    const requirementBlob = normalizeText([
      record.major_requirement_category,
      record.core,
      record.gn_minor,
      record.major_minor,
      record.note,
    ].filter(Boolean).join(' '));
    return requirementBlob.includes(requirementNeedle) && siteMatches(record.site, params.site);
  });

  const byCode = new Map<string, any>();
  matchedRecords.forEach((record) => {
    if (!byCode.has(record.course_code)) {
      byCode.set(record.course_code, {
        course_code: record.course_code,
        title_from_requirement_reference: record.title,
        credits_from_requirement_reference: record.credits,
        site: record.site,
        satisfies: [],
        notes: [],
      });
    }

    const item = byCode.get(record.course_code);
    item.satisfies.push({
      major_minor: record.major_minor,
      major_requirement_category: record.major_requirement_category,
      core: record.core,
      gn_minor: record.gn_minor,
    });
    if (record.note) item.notes.push(record.note);
  });

  const joined = Array.from(byCode.values()).map((item) => {
    const course = courses[item.course_code];
    const sections = course?.sections || [];
    const matchingSections = sections.filter((section: any) => sectionFormatMatches(section, params.format));
    return {
      ...item,
      title: course?.title || item.title_from_requirement_reference,
      campus: course?.campus || item.site,
      credits: course?.credits || item.credits_from_requirement_reference,
      prerequisites: course?.prerequisites || null,
      course_database_found: Boolean(course),
      section_count: sections.length,
      matching_section_count: matchingSections.length,
      matching_sections: matchingSections,
      all_section_formats: Array.from(new Set(sections.map((section: any) => section.format).filter(Boolean))),
    };
  });

  const formatFiltered = params.format
    ? joined.filter((item) => item.matching_section_count > 0)
    : joined;
  const maxResults = params.max_results || 12;
  const checkedWithCourseDetails = joined.filter((item) => item.course_database_found).length;
  const checkedWithSections = joined.filter((item) => item.section_count > 0).length;

  return {
    query: {
      requirement,
      site: params.site || null,
      format: params.format || null,
    },
    conclusion: params.format
      ? (formatFiltered.length
        ? `Found ${formatFiltered.length} course(s) with matching ${params.format} section data.`
        : `No matching ${params.format} sections found in the current course database for this requirement/site query.`)
      : `Found ${joined.length} approved course(s) for this requirement/site query.`,
    counts: {
      approved_requirement_courses: joined.length,
      found_in_course_database: checkedWithCourseDetails,
      with_section_data: checkedWithSections,
      matching_requested_format: formatFiltered.length,
      missing_course_database_details: joined.length - checkedWithCourseDetails,
    },
    results: formatFiltered.slice(0, maxResults),
    checked_courses_sample: joined.slice(0, 20).map((item) => ({
      course_code: item.course_code,
      title: item.title,
      course_database_found: item.course_database_found,
      all_section_formats: item.all_section_formats,
      matching_section_count: item.matching_section_count,
    })),
    data_sources: [
      'study_away_requirement_courses.json',
      'courses_complete.json',
      'Global Courses Satisfying Shanghai Degree Requirements.xlsx',
    ],
  };
}

function planCandidates(major: string, completedCourses: string[]) {
  const normalizedMajor = normalizeMajor(major);
  const majorRequirements = majorReqs[normalizedMajor] || majorReqs.majors?.[normalizedMajor] || {};
  const requiredCodes = Array.from(new Set([
    ...Object.keys(majorRequirements.declaration_prerequisites || {}),
    ...(majorRequirements.core_courses || []),
    ...(majorRequirements.before_study_away || []),
    ...(majorRequirements.foundational_math || []),
    ...(majorRequirements.core_cs || []),
    ...(majorRequirements.data_analysis || []),
  ])) as string[];

  const completedWithEquiv = new Set(addEquivalentCourses(completedCourses));
  const missingShanghai = requiredCodes.filter((code) => !completedWithEquiv.has(code) && !completedWithEquiv.has(equivalencies[code]));

  const recommendations = missingShanghai
    .map((shanghaiCode) => {
      const nyCode = equivalencies[shanghaiCode];
      const course = nyCode ? courses[nyCode] : null;
      if (!nyCode || !course) return null;

      const department = departmentForCourse(nyCode);
      const departmentRules = department ? rules.departments?.[department] : null;

      return {
        code: nyCode,
        title: course.title,
        credits: course.credits,
        replaces: shanghaiCode,
        prerequisites: course.prerequisites || 'None',
        missing_prerequisites: course.prerequisites ? missingPrerequisites(course.prerequisites, completedCourses) : [],
        sections: course.sections || [],
        registration_rules: departmentRules || null,
        evidence: ['courses_complete.json', 'equivalencies.json', 'shanghai_major_requirements.json', 'study_away_rules_complete.json'],
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    major,
    normalized_major: normalizedMajor,
    completed_courses: completedCourses,
    missing_shanghai_requirements: missingShanghai,
    recommendations,
    study_away_rules: {
      general_rules: rules.general_rules,
      credit_limits: rules.credit_limits,
      important_warnings: rules.important_warnings,
    },
  };
}

function academicCareerPlan(studentId: string) {
  const profile = studentProfiles.find((item) => item.student_id === studentId);
  if (!profile) return { error: 'Profile not found' };

  const normalizedMajor = normalizeMajor(profile.major);
  const majorRequirements = majorReqs[normalizedMajor] || {};
  const requiredCodes = Array.from(new Set([
    ...Object.keys(majorRequirements.declaration_prerequisites || {}),
    ...(majorRequirements.foundational_math || []),
    ...(majorRequirements.core_cs || []),
    ...(majorRequirements.data_analysis || []),
    ...(majorRequirements.before_study_away || []),
  ])) as string[];
  const completedWithEquiv = new Set(addEquivalentCourses(profile.completed_courses || []));
  const missing = requiredCodes.filter((code) => !completedWithEquiv.has(code) && !completedWithEquiv.has(equivalencies[code]));
  const completedRequired = requiredCodes.filter((code) => completedWithEquiv.has(code) || completedWithEquiv.has(equivalencies[code]));

  return {
    student: {
      student_id: profile.student_id,
      name: profile.name,
      major: profile.major,
      normalized_major: normalizedMajor,
      year: profile.year,
      gpa: profile.gpa,
      credits_completed: profile.credits_completed,
    },
    degree_audit: {
      required_courses_considered: requiredCodes,
      completed_required_courses: completedRequired,
      missing_courses: missing,
      progress_percent: requiredCodes.length ? Math.round((completedRequired.length / requiredCodes.length) * 100) : 0,
      capstone: majorRequirements.capstone || null,
      concentration_note: majorRequirements.concentrations?.note || 'AI concentration planning should prioritize ML/AI electives, math depth, and project work.',
    },
    future_semester_plan: [
      {
        term: 'Fall 2026',
        focus: 'Study Away readiness and remaining DS core',
        recommended_courses: missing.slice(0, 3),
        actions: ['Confirm Study Away campus', 'Check department registration rules', 'Prepare backup courses'],
      },
      {
        term: 'Spring 2027',
        focus: 'AI concentration depth and portfolio',
        recommended_courses: ['Advanced ML/AI elective', 'Data Science elective', 'Research/project-based course'],
        actions: ['Build a computer vision or ML portfolio project', 'Meet advisor for degree audit', 'Prepare internship applications'],
      },
      {
        term: 'Fall 2027',
        focus: 'Capstone preparation and career positioning',
        recommended_courses: ['Capstone preparation', 'Advanced DS/AI elective', 'Open elective aligned with career goal'],
        actions: ['Finalize resume and GitHub/portfolio', 'Identify capstone topic', 'Apply for internships or research roles'],
      },
      {
        term: 'Spring 2028',
        focus: 'Graduation completion',
        recommended_courses: ['DATS-SHU 420 or approved capstone equivalent', 'Any remaining graduation requirement'],
        actions: ['Final degree audit', 'Complete capstone', 'Finalize job or graduate school plan'],
      },
    ],
    career_tracks: [
      {
        title: 'Machine Learning / AI Engineer',
        why_it_fits: 'Matches Data Science AI concentration plus ML and Computer Vision coursework.',
        preparation: ['Python and ML fundamentals', 'Deep learning/computer vision project', 'Model evaluation and deployment basics'],
      },
      {
        title: 'Data Scientist / Analytics',
        why_it_fits: 'Matches statistics, ML, and DS core requirements.',
        preparation: ['SQL and analytics case studies', 'Experimentation and causal reasoning', 'Data storytelling portfolio'],
      },
      {
        title: 'AI Research / Graduate School',
        why_it_fits: 'Possible if research experience and math depth are strengthened.',
        preparation: ['Faculty research or independent study', 'Paper reading habit', 'Research-style project writeup'],
      },
    ],
    evidence: ['student_profile.json', 'shanghai_major_requirements.json', 'equivalencies.json', 'study_away_rules_complete.json'],
  };
}

export async function POST(request: Request) {
  const { tool, params }: { tool: string; params: ToolParams } = await request.json();

  switch (tool) {
    case 'get_student_profile': {
      const profile = studentProfiles.find((item) => item.student_id === params.student_id);
      return NextResponse.json(profile || { error: 'Profile not found' });
    }

    case 'get_course_info':
      return NextResponse.json(courses[params.course_code] || { error: 'Course not found' });

    case 'search_courses': {
      const keyword = params.keyword?.toLowerCase() || '';
      const results = Object.entries(courses)
        .filter(([code, info]) => {
          if (params.campus && info.campus !== params.campus) return false;
          return code.toLowerCase().includes(keyword) || info.title?.toLowerCase().includes(keyword);
        })
        .slice(0, 20)
        .map(([code, info]) => ({ code, title: info.title, campus: info.campus }));
      return NextResponse.json(results);
    }

    case 'get_course_schedule': {
      const course = courses[params.course_code];
      return NextResponse.json({ course: params.course_code, title: course?.title, sections: course?.sections || [] });
    }

    case 'check_course_availability': {
      const course = courses[params.course_code];
      const availability = course?.sections?.map((section: any) => ({
        section: section.section,
        seats_available: section.seats_available,
        status: section.seats_available > 0 ? 'Open' : 'Full',
      })) || [];
      return NextResponse.json({ course: params.course_code, sections: availability });
    }

    case 'get_course_prerequisites':
      return NextResponse.json({ prerequisites: courses[params.course_code]?.prerequisites || 'None' });

    case 'get_equivalent_course':
      return NextResponse.json({ equivalent: equivalencies[params.shanghai_code] || null });

    case 'get_satisfying_courses':
      return NextResponse.json({ courses: satisfying[params.category] || [] });

    case 'find_requirement_courses':
      return NextResponse.json(findRequirementCourses(params));

    case 'get_cs_equivalencies_prereqs':
      return NextResponse.json(csEquivalenciesPrereqs);

    case 'check_course_satisfies': {
      const categories = Object.entries(satisfying)
        .filter(([, courseList]) => courseList.includes(params.course_code))
        .map(([category]) => category);
      return NextResponse.json({ categories });
    }

    case 'get_department_rules':
      return NextResponse.json(rules.departments?.[params.department] || {});

    case 'get_registration_deadline': {
      const department = rules.departments?.[params.department];
      return NextResponse.json({ deadline: department?.registration_start || rules.general_rules?.priority_deadline });
    }

    case 'get_credit_limits':
      return NextResponse.json(rules.credit_limits || {});

    case 'get_study_away_rules': {
      if (params.department) return NextResponse.json(rules.departments?.[params.department] || {});
      if (params.scope === 'department' && params.department) return NextResponse.json(rules.departments?.[params.department] || {});
      if (params.scope && params.scope !== 'department') return NextResponse.json(rules[params.scope] || {});
      return NextResponse.json({
        general_rules: rules.general_rules,
        registration_process: rules.registration_process,
        credit_limits: rules.credit_limits,
        important_warnings: rules.important_warnings,
        departments: Object.keys(rules.departments || {}),
      });
    }

    case 'get_major_requirements':
      return NextResponse.json(majorReqs[normalizeMajor(params.major)] || majorReqs.majors?.[normalizeMajor(params.major)] || {});

    case 'get_core_curriculum':
      return NextResponse.json(majorReqs['Core Curriculum'] || majorReqs.core_curriculum || {});

    case 'get_core_courses':
      return NextResponse.json({ courses: majorReqs['Core Curriculum']?.shanghai_courses || majorReqs.core_curriculum?.courses || [] });

    case 'get_minor_requirements':
      return NextResponse.json(majorReqs.Minors?.[params.minor] || majorReqs.minors?.[params.minor] || {});

    case 'check_prerequisites': {
      const targetCourse = courses[params.course_code];
      const completed = params.completed_courses || [];

      if (!targetCourse?.prerequisites || targetCourse.prerequisites === 'None') {
        return NextResponse.json({ can_enroll: true, reason: '无先修课要求' });
      }

      const missing = missingPrerequisites(targetCourse.prerequisites, completed);

      return NextResponse.json({
        can_enroll: missing.length === 0,
        prerequisites: targetCourse.prerequisites,
        missing_prerequisites: missing,
        reason: missing.length === 0 ? '满足先修课要求' : `缺少先修课：${missing.join(', ')}`,
      });
    }

    case 'can_take_course': {
      const targetCourse = courses[params.course_code];
      const completed = params.completed_courses || [];

      if (!targetCourse) return NextResponse.json({ can_take: false, reason: '课程不存在' });
      if (!targetCourse.prerequisites || targetCourse.prerequisites === 'None') {
        return NextResponse.json({ can_take: true, reason: '无先修课要求' });
      }

      const missing = missingPrerequisites(targetCourse.prerequisites, completed);

      return NextResponse.json({
        can_take: missing.length === 0,
        reason: missing.length === 0 ? '可以选课' : `缺少先修课：${missing.join(', ')}`,
      });
    }

    case 'evaluate_course_access_with_plan':
      return NextResponse.json(evaluateCourseAccessWithPlan(params));

    case 'recommend_courses': {
      const completedCourses = params.completed_courses || [];
      const recommendations: any[] = [];

      Object.entries(satisfying).forEach(([category, courseList]) => {
        courseList.forEach((code) => {
          if (!completedCourses.includes(code) && courses[code]) {
            recommendations.push({
              code,
              title: courses[code].title,
              reason: `满足 ${category} 要求`,
            });
          }
        });
      });

      return NextResponse.json({ recommendations: recommendations.slice(0, params.max_results || 10) });
    }

    case 'generate_study_away_plan':
      return NextResponse.json(planCandidates(params.major, params.completed_courses || []));

    case 'generate_academic_career_plan':
      return NextResponse.json(academicCareerPlan(params.student_id));

    case 'generate_personalized_schedule':
      return NextResponse.json(generatePersonalizedSchedule(params));

    case 'list_available_courses':
      return NextResponse.json(listAvailableCourses(params));

    case 'replace_schedule_course':
      return NextResponse.json(replaceScheduleCourse(params));

    case 'compare_courses': {
      const courseCodes = params.course_codes || [];
      const compareAspects = params.compare_aspects || ['difficulty', 'workload', 'prerequisites', 'schedule', 'professor'];

      const comparison = courseCodes.map((code: string) => {
        const course = courses[code];
        const workloadInfo = courseWorkload.course_difficulty?.[code];
        const historyInfo = courseHistory[code];

        if (!course) return null;

        const result: any = { course_code: code, title: course.title };

        if (compareAspects.includes('difficulty')) {
          result.difficulty = workloadInfo ? {
            rating: workloadInfo.difficulty_rating,
            description: workloadInfo.description
          } : { rating: 'N/A', description: '暂无数据' };
        }

        if (compareAspects.includes('workload')) {
          result.workload = workloadInfo ? {
            weekly_hours: workloadInfo.weekly_hours,
            breakdown: workloadInfo.workload_breakdown,
            peak_weeks: workloadInfo.peak_weeks
          } : { weekly_hours: 'N/A' };
        }

        if (compareAspects.includes('prerequisites')) {
          result.prerequisites = course.prerequisites || 'None';
        }

        if (compareAspects.includes('schedule')) {
          result.schedule = {
            sections: course.sections?.length || 0,
            typical_terms: historyInfo?.typical_terms || ['Unknown']
          };
        }

        if (compareAspects.includes('professor')) {
          const profName = course.sections?.[0]?.instructor;
          const profInfo = profName ? professorRatings[profName] : null;
          result.professor = profInfo ? {
            name: profName,
            rating: profInfo.overall_rating,
            teaching_style: profInfo.teaching_style
          } : { name: profName || 'TBA', rating: 'N/A' };
        }

        return result;
      }).filter(Boolean);

      return NextResponse.json({ comparison, aspects_compared: compareAspects });
    }

    case 'get_professor_info': {
      const profName = params.professor_name;
      const profInfo = professorRatings[profName];

      if (!profInfo) {
        return NextResponse.json({ error: `未找到教授 ${profName} 的信息` });
      }

      const result: any = {
        name: profName,
        department: profInfo.department,
        overall_rating: profInfo.overall_rating,
        difficulty: profInfo.difficulty,
        teaching_style: profInfo.teaching_style,
        grading: profInfo.grading,
        research_areas: profInfo.research_areas,
        student_reviews: profInfo.student_reviews
      };

      if (params.course_code) {
        const course = courses[params.course_code];
        if (course && profInfo.courses.includes(params.course_code)) {
          result.teaches_this_course = true;
          result.course_specific_note = `${profName} 教授 ${course.title}`;
        } else {
          result.teaches_this_course = false;
        }
      }

      return NextResponse.json(result);
    }

    case 'estimate_workload': {
      const courseCodes = params.course_codes || [];
      const studentId = params.student_id;
      const profile = studentProfiles.find((p) => p.student_id === studentId);

      let totalHours = 0;
      let totalDifficulty = 0;
      const courseDetails: any[] = [];

      courseCodes.forEach((code: string) => {
        const workloadInfo = courseWorkload.course_difficulty?.[code];
        if (workloadInfo) {
          totalHours += workloadInfo.weekly_hours;
          totalDifficulty += workloadInfo.difficulty_rating;
          courseDetails.push({
            course_code: code,
            title: courses[code]?.title || code,
            weekly_hours: workloadInfo.weekly_hours,
            difficulty_rating: workloadInfo.difficulty_rating,
            description: workloadInfo.description
          });
        }
      });

      const thresholds = courseWorkload.workload_thresholds;
      let workloadLevel = 'overload';
      if (totalHours <= thresholds.light.max_hours && totalDifficulty <= thresholds.light.max_difficulty) {
        workloadLevel = 'light';
      } else if (totalHours <= thresholds.moderate.max_hours && totalDifficulty <= thresholds.moderate.max_difficulty) {
        workloadLevel = 'moderate';
      } else if (totalHours <= thresholds.heavy.max_hours && totalDifficulty <= thresholds.heavy.max_difficulty) {
        workloadLevel = 'heavy';
      }

      const recommendations: string[] = [];
      if (workloadLevel === 'overload') {
        recommendations.push('⚠️ 工作量过大，建议减少1-2门课或选择难度较低的课程');
      } else if (workloadLevel === 'heavy') {
        recommendations.push('⚠️ 工作量较重，需要良好的时间管理');
      } else if (workloadLevel === 'moderate') {
        recommendations.push('✅ 工作量适中，可以应对');
      } else {
        recommendations.push('✅ 工作量较轻，可以考虑增加1门课或参加课外活动');
      }

      return NextResponse.json({
        total_weekly_hours: totalHours,
        total_difficulty_score: totalDifficulty,
        workload_level: workloadLevel,
        course_details: courseDetails,
        recommendations,
        student_background: profile ? {
          year: profile.year,
          gpa: profile.gpa,
          completed_courses_count: profile.completed_courses?.length || 0
        } : null
      });
    }

    case 'find_study_away_restrictions': {
      const major = params.major ? normalizeMajor(params.major) : null;
      const courseCode = params.course_code;

      const result: any = {};

      if (major) {
        const majorRestrictions = studyAwayRestrictions[major];
        if (majorRestrictions) {
          result.major = major;
          result.restrictions = majorRestrictions.study_away_restrictions;
          result.recommended_courses_in_ny = majorRestrictions.recommended_courses_in_ny;
          result.not_recommended = majorRestrictions.not_recommended;
        } else {
          result.major = major;
          result.restrictions = ['未找到该专业的具体限制，请咨询Academic Advising'];
        }
      }

      result.general_rules = studyAwayRestrictions.general_rules;

      if (courseCode) {
        const course = courses[courseCode];
        if (course) {
          result.course_check = {
            course_code: courseCode,
            title: course.title,
            campus: course.campus,
            note: course.campus === 'Shanghai'
              ? '这是上海课程，不适用于Study Away期间选课'
              : '这是纽约课程，可以在Study Away期间选修'
          };
        }
      }

      return NextResponse.json(result);
    }

    case 'get_course_history': {
      const courseCode = params.course_code;
      const terms = params.terms || 3;

      const historyInfo = courseHistory[courseCode];

      if (!historyInfo) {
        return NextResponse.json({
          error: `未找到课程 ${courseCode} 的历史数据`,
          suggestion: '这可能是新开设的课程，或者数据库中暂无记录'
        });
      }

      return NextResponse.json({
        course_code: courseCode,
        course_name: historyInfo.course_name,
        history: historyInfo.history.slice(0, terms),
        typical_terms: historyInfo.typical_terms,
        popularity: historyInfo.popularity,
        recommendation: historyInfo.recommendation
      });
    }

    case 'suggest_backup_courses': {
      const courseCode = params.course_code;
      const reason = params.reason;
      const studentId = params.student_id;

      const profile = studentProfiles.find((p) => p.student_id === studentId);
      if (!profile) {
        return NextResponse.json({ error: 'Student profile not found' });
      }

      const targetCourse = courses[courseCode];
      if (!targetCourse) {
        return NextResponse.json({ error: 'Course not found' });
      }

      const completedCourses = profile.completed_courses || [];
      const backups: any[] = [];

      // Find similar courses (same department or satisfies same requirements)
      Object.entries(courses).forEach(([code, course]: [string, any]) => {
        if (code === courseCode) return;

        // Same department
        const sameDept = code.split('-')[0] === courseCode.split('-')[0];

        // Check if student can take it
        const canTake = !course.prerequisites ||
          course.prerequisites === 'None' ||
          missingPrerequisites(course.prerequisites, completedCourses).length === 0;

        // Has available seats
        const hasSeats = course.sections?.some((s: any) => (s.seats_available ?? 0) > 0);

        if (sameDept && canTake && hasSeats) {
          const workloadInfo = courseWorkload.course_difficulty?.[code];
          backups.push({
            course_code: code,
            title: course.title,
            credits: course.credits,
            prerequisites: course.prerequisites || 'None',
            seats_available: course.sections?.reduce((sum: number, s: any) => sum + (s.seats_available ?? 0), 0) || 0,
            difficulty: workloadInfo?.difficulty_rating || 'N/A',
            reason_suitable: sameDept ? '同一系课程' : '满足相同要求'
          });
        }
      });

      // Sort by difficulty if reason is difficulty_too_high
      if (reason === 'difficulty_too_high') {
        backups.sort((a, b) => (a.difficulty === 'N/A' ? 999 : a.difficulty) - (b.difficulty === 'N/A' ? 999 : b.difficulty));
      }

      return NextResponse.json({
        target_course: {
          course_code: courseCode,
          title: targetCourse.title,
          reason_unavailable: reason
        },
        backup_courses: backups.slice(0, 5),
        total_found: backups.length
      });
    }

    case 'get_community_reviews': {
      const courseCode = params.course_code;
      const sortBy = params.sort_by || 'helpful';
      const minRating = params.min_rating || 0;

      const reviews = (communityReviews.reviews || []).filter((r: any) =>
        r.course_code === courseCode && r.rating >= minRating
      );

      // Sort reviews
      if (sortBy === 'recent') {
        reviews.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } else if (sortBy === 'rating') {
        reviews.sort((a: any, b: any) => b.rating - a.rating);
      } else {
        reviews.sort((a: any, b: any) => b.helpful_count - a.helpful_count);
      }

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;

      const avgDifficulty = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.difficulty, 0) / reviews.length
        : 0;

      const workloadDistribution = {
        light: reviews.filter((r: any) => r.workload === 'light').length,
        moderate: reviews.filter((r: any) => r.workload === 'moderate').length,
        heavy: reviews.filter((r: any) => r.workload === 'heavy').length,
        overload: reviews.filter((r: any) => r.workload === 'overload').length
      };

      const recommendRate = reviews.length > 0
        ? (reviews.filter((r: any) => r.would_recommend).length / reviews.length * 100).toFixed(1)
        : 0;

      return NextResponse.json({
        course_code: courseCode,
        total_reviews: reviews.length,
        average_rating: avgRating.toFixed(1),
        average_difficulty: avgDifficulty.toFixed(1),
        workload_distribution: workloadDistribution,
        recommend_rate: `${recommendRate}%`,
        reviews: reviews.slice(0, 10)
      });
    }

    case 'get_community_tips': {
      const category = params.category;
      const keyword = params.keyword;

      let tips = communityReviews.tips || [];

      if (category) {
        tips = tips.filter((t: any) => t.category === category);
      }

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        tips = tips.filter((t: any) =>
          t.tip_text.toLowerCase().includes(lowerKeyword) ||
          t.tags.some((tag: string) => tag.toLowerCase().includes(lowerKeyword))
        );
      }

      tips.sort((a: any, b: any) => b.helpful_count - a.helpful_count);

      return NextResponse.json({
        category: category || 'all',
        total_tips: tips.length,
        tips: tips.slice(0, 10)
      });
    }

    case 'search_community_experiences': {
      const query = params.query.toLowerCase();
      const limit = params.limit || 5;

      const reviews = communityReviews.reviews || [];
      const tips = communityReviews.tips || [];

      const matchedReviews = reviews.filter((r: any) =>
        (r.review_text && r.review_text.toLowerCase().includes(query)) ||
        (r.tags && r.tags.some((tag: string) => tag && tag.toLowerCase().includes(query))) ||
        (r.course_code && courses[r.course_code]?.title?.toLowerCase().includes(query))
      ).slice(0, limit);

      const matchedTips = tips.filter((t: any) =>
        (t.tip_text && t.tip_text.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some((tag: string) => tag && tag.toLowerCase().includes(query)))
      ).slice(0, limit);

      return NextResponse.json({
        query: params.query,
        results: {
          reviews: matchedReviews,
          tips: matchedTips,
          total: matchedReviews.length + matchedTips.length
        }
      });
    }

    case 'simulate_future_semesters': {
      const studentId = params.student_id;
      const currentTerm = params.current_term;
      const coursePlan = params.course_plan || {};

      const profile = studentProfiles.find((p) => p.student_id === studentId);
      if (!profile) {
        return NextResponse.json({ error: 'Student profile not found' });
      }

      const simulation: any = {
        student_id: studentId,
        current_gpa: profile.gpa,
        semesters: []
      };

      let cumulativeGPA = profile.gpa;
      let totalCredits = profile.credits_completed || 0;
      const terms = Object.keys(coursePlan);

      terms.forEach((term, index) => {
        const courseCodes = coursePlan[term] || [];
        let termWorkload = 0;
        let termDifficulty = 0;
        let predictedGrades: any[] = [];

        courseCodes.forEach((code: string) => {
          const workloadInfo = courseWorkload.course_difficulty?.[code];
          const course = courses[code];

          if (workloadInfo) {
            termWorkload += workloadInfo.weekly_hours;
            termDifficulty += workloadInfo.difficulty_rating;

            // Predict grade based on workload and student GPA
            let predictedGrade = 'B+';
            if (termWorkload > 50) {
              predictedGrade = cumulativeGPA > 3.5 ? 'B+' : 'B';
            } else if (termWorkload > 40) {
              predictedGrade = cumulativeGPA > 3.5 ? 'A-' : 'B+';
            } else {
              predictedGrade = cumulativeGPA > 3.5 ? 'A' : 'A-';
            }

            predictedGrades.push({
              course_code: code,
              title: course?.title || code,
              predicted_grade: predictedGrade,
              difficulty: workloadInfo.difficulty_rating
            });
          }
        });

        // Calculate term GPA
        const gradePoints: any = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7 };
        const termGPA = predictedGrades.length > 0
          ? predictedGrades.reduce((sum, g) => sum + (gradePoints[g.predicted_grade] || 3.0), 0) / predictedGrades.length
          : cumulativeGPA;

        // Update cumulative GPA
        const termCredits = courseCodes.length * 4;
        cumulativeGPA = ((cumulativeGPA * totalCredits) + (termGPA * termCredits)) / (totalCredits + termCredits);
        totalCredits += termCredits;

        const workloadLevel = termWorkload > 50 ? 'overload' : termWorkload > 40 ? 'heavy' : termWorkload > 30 ? 'moderate' : 'light';

        simulation.semesters.push({
          term,
          courses: courseCodes,
          total_weekly_hours: termWorkload,
          total_difficulty: termDifficulty,
          workload_level: workloadLevel,
          predicted_grades: predictedGrades,
          term_gpa: termGPA.toFixed(2),
          cumulative_gpa: cumulativeGPA.toFixed(2),
          warnings: termWorkload > 50 ? ['⚠️ 工作量过载，可能影响成绩'] : [],
          risks: []
        });
      });

      // Generate recommendations
      const recommendations: string[] = [];
      simulation.semesters.forEach((sem: any, index: number) => {
        if (sem.workload_level === 'overload') {
          recommendations.push(`${sem.term}: 工作量过载（${sem.total_weekly_hours}小时/周），建议减少1门课`);
        }
        if (parseFloat(sem.cumulative_gpa) < cumulativeGPA - 0.2) {
          recommendations.push(`${sem.term}: 预测GPA下降到${sem.cumulative_gpa}，建议调整课程难度`);
        }
      });

      simulation.recommendations = recommendations;
      simulation.final_gpa = cumulativeGPA.toFixed(2);
      simulation.gpa_change = (cumulativeGPA - profile.gpa).toFixed(2);

      return NextResponse.json(simulation);
    }

    case 'detect_minor_opportunities': {
      const profile = studentProfiles.find((p) => p.student_id === params.student_id);
      if (!profile) {
        return NextResponse.json({ error: 'Student profile not found' });
      }

      const completedCourses = profile.completed_courses || [];
      const departmentCounts: Record<string, { count: number; courses: string[] }> = {};

      // Count courses by department
      completedCourses.forEach((code: string) => {
        const dept = code.split('-')[0]; // e.g., "CSCI" from "CSCI-UA 101"
        if (!departmentCounts[dept]) {
          departmentCounts[dept] = { count: 0, courses: [] };
        }
        departmentCounts[dept].count++;
        departmentCounts[dept].courses.push(code);
      });

      const opportunities: any[] = [];

      // Check each department for minor potential
      Object.entries(departmentCounts).forEach(([dept, data]) => {
        if (data.count >= 2 && dept !== profile.major?.split(' ')[0]) {
          const minorName = dept === 'IMA' ? 'Interactive Media Arts' :
                           dept === 'ECON' ? 'Economics' :
                           dept === 'MATH' ? 'Mathematics' :
                           dept === 'PHYS' ? 'Physics' :
                           dept;

          const minorReqs = majorReqs.Minors?.[minorName] || majorReqs.minors?.[minorName];
          const requiredCourses = minorReqs?.required_courses || 6;
          const remaining = requiredCourses - data.count;

          opportunities.push({
            minor: minorName,
            department: dept,
            completed_courses: data.courses,
            courses_completed: data.count,
            courses_required: requiredCourses,
            courses_remaining: remaining > 0 ? remaining : 0,
            feasibility: remaining <= 2 ? 'high' : remaining <= 4 ? 'medium' : 'low',
            recommendation: remaining <= 0 ? `✅ 已完成${minorName} Minor要求！` :
                           remaining <= 2 ? `💡 只需再修${remaining}门课即可完成${minorName} Minor` :
                           `📚 还需${remaining}门课完成${minorName} Minor`,
          });
        }
      });

      opportunities.sort((a, b) => a.courses_remaining - b.courses_remaining);

      return NextResponse.json({
        student_id: params.student_id,
        opportunities,
        summary: opportunities.length > 0 ?
          `发现${opportunities.length}个潜在Minor机会` :
          '暂无明显的Minor机会（需要至少2门同一系的课程）',
      });
    }

    default:
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
  }
}
