export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_student_profile',
      description: 'Get a student profile by student_id from the local profile data source. Use this before personalized planning when a student id is known.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
        },
        required: ['student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_course_info',
      description: 'Get complete course data from the local course database, including title, credits, prerequisites, sections, seats, and campus.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code, for example CSCI-UA 473.' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_courses',
      description: 'Search the local course database by keyword and optional campus.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search keyword.' },
          campus: { type: 'string', description: 'Optional campus, such as New York or Shanghai.' },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_course_schedule',
      description: 'Get all available sections and meeting times for a course from the course database.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code.' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_course_availability',
      description: 'Check seat availability for a course from the local course data.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code.' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_prerequisites',
      description: 'Check whether a student satisfies a course prerequisite, using completed courses and Shanghai-New York equivalencies.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Target course code.' },
          completed_courses: { type: 'array', items: { type: 'string' }, description: 'Completed course codes.' },
        },
        required: ['course_code', 'completed_courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'can_take_course',
      description: 'Give an overall data-backed enrollment judgment for a course, including prerequisite status.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Target course code.' },
          completed_courses: { type: 'array', items: { type: 'string' }, description: 'Completed course codes.' },
        },
        required: ['course_code', 'completed_courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_course_access_with_plan',
      description: 'Evaluate whether the logged-in student can take a target course now. If prerequisites are missing, build a bridge-course plan and recommended sequence using profile, equivalencies, prerequisites, and schedule data.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
          course_code: { type: 'string', description: 'Target course code, for example CSCI-UA 473.' },
          term: { type: 'string', description: 'Target term, for example Fall 2026.' },
        },
        required: ['student_id', 'course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_equivalent_course',
      description: 'Look up the New York equivalent for a Shanghai course using the local equivalency table.',
      parameters: {
        type: 'object',
        properties: {
          shanghai_code: { type: 'string', description: 'Shanghai course code, for example CSCI-SHU 220.' },
        },
        required: ['shanghai_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_major_requirements',
      description: 'Get major requirements from the local NYU Shanghai major requirements data.',
      parameters: {
        type: 'object',
        properties: {
          major: { type: 'string', description: 'Major name, for example Computer Science.' },
        },
        required: ['major'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_core_curriculum',
      description: 'Get Core Curriculum requirements from the local requirements data.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_core_courses',
      description: 'Get local Core Curriculum course lists by category.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional Core category, for example Algorithmic Thinking.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_minor_requirements',
      description: 'Get minor requirements from the local requirements data.',
      parameters: {
        type: 'object',
        properties: {
          minor: { type: 'string', description: 'Minor name, for example Data Science.' },
        },
        required: ['minor'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_satisfying_courses',
      description: 'Get courses satisfying a requirement category from the local satisfying-courses data.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Requirement category name.' },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_requirement_courses',
      description: 'Find Study Away courses that satisfy a Shanghai degree/core/major requirement, then join them with the local course database for title, campus, sections, format, seats, and data coverage. Use this for questions such as whether STS courses in New York have online sections.',
      parameters: {
        type: 'object',
        properties: {
          requirement: { type: 'string', description: 'Requirement keyword or category, for example Science, Technology and Society, STS, Data Science Artificial Intelligence Concentration.' },
          site: { type: 'string', description: 'Optional Study Away site/campus, for example New York, Abu Dhabi, London, or United States.' },
          format: { type: 'string', description: 'Optional desired format keyword, for example online, remote, virtual, lecture, seminar.' },
          max_results: { type: 'number', description: 'Maximum returned matching courses.' },
        },
        required: ['requirement'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_course_satisfies',
      description: 'Check which requirement categories a course satisfies using the satisfying-courses data.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code.' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_study_away_rules',
      description: 'Get Study Away registration rules, general warnings, credit limits, registration process, or department-specific rules.',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'Optional scope: general_rules, registration_process, credit_limits, important_warnings, departments, or department.',
          },
          department: { type: 'string', description: 'Optional exact department name, for example Computer Science (CSCI-UA).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_department_rules',
      description: 'Get Study Away registration rules for one department.',
      parameters: {
        type: 'object',
        properties: {
          department: { type: 'string', description: 'Department name, for example Computer Science (CSCI-UA).' },
        },
        required: ['department'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_registration_deadline',
      description: 'Get registration start or priority deadline data for a department.',
      parameters: {
        type: 'object',
        properties: {
          department: { type: 'string', description: 'Department name.' },
        },
        required: ['department'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_credit_limits',
      description: 'Get Study Away credit limit rules.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_courses',
      description: 'Recommend data-backed courses for a major and completed-course list.',
      parameters: {
        type: 'object',
        properties: {
          major: { type: 'string', description: 'Major name.' },
          completed_courses: { type: 'array', items: { type: 'string' }, description: 'Completed course codes.' },
          max_results: { type: 'number', description: 'Maximum number of results.' },
        },
        required: ['major', 'completed_courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_study_away_plan',
      description: 'Generate a Study Away plan using local course data, equivalencies, major requirements, and Study Away rules.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Student name.' },
          major: { type: 'string', description: 'Major name.' },
          year: { type: 'string', description: 'Class year.' },
          completed_courses: { type: 'array', items: { type: 'string' }, description: 'Completed course codes.' },
        },
        required: ['major', 'completed_courses'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_academic_career_plan',
      description: 'Generate an academic and career plan using the student profile, major requirements, completed courses, Study Away rules, and career-track heuristics.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
        },
        required: ['student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_personalized_schedule',
      description: 'Generate a personalized semester schedule for the logged-in student by using profile, completed courses, equivalencies, prerequisites, graduation requirements, demo meeting-time data, course format preferences, and career goals. IMPORTANT: Use campus parameter to filter courses by location (New York or Shanghai).',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
          term: { type: 'string', description: 'Target term, for example Fall 2026.' },
          campus: { type: 'string', description: 'Target campus: "New York" or "Shanghai". REQUIRED for Study Away planning.' },
          career_goal: { type: 'string', description: 'Optional career goal, for example AI Engineer or Data Scientist.' },
          preferred_formats: { type: 'array', items: { type: 'string' }, description: 'Optional preferred formats such as Online, Hybrid, In Person.' },
          preferred_tags: { type: 'array', items: { type: 'string' }, description: 'Optional interest tags such as ai, machine-learning, project-based, online.' },
          preferred_days: { type: 'array', items: { type: 'string' }, description: 'Optional preferred meeting days using M,T,W,R,F. For example T,R for Tuesday/Thursday.' },
          avoid_days: { type: 'array', items: { type: 'string' }, description: 'Optional days to avoid using M,T,W,R,F.' },
          max_credits: { type: 'number', description: 'Maximum credits for the schedule.' },
        },
        required: ['student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_available_courses',
      description: 'List all courses the logged-in student can take in a term, plus courses that are not currently available because of prerequisites or seats. Use this when the student asks what courses they can choose, before committing to a final timetable.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
          term: { type: 'string', description: 'Target term, for example Fall 2026.' },
        },
        required: ['student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_schedule_course',
      description: 'Replace one course in the logged-in student timetable with a target course, then return an updated schedule_result that the UI can render.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
          term: { type: 'string', description: 'Target term, for example Fall 2026.' },
          target_course_code: { type: 'string', description: 'Course to add to the timetable, for example ANTH-UA 35.' },
          remove_course_code: { type: 'string', description: 'Optional course to remove, for example PHIL-UA 5.' },
          preferred_days: { type: 'array', items: { type: 'string' }, description: 'Optional preferred days using M,T,W,R,F.' },
          avoid_days: { type: 'array', items: { type: 'string' }, description: 'Optional days to avoid using M,T,W,R,F.' },
        },
        required: ['student_id', 'target_course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_courses',
      description: 'Compare multiple courses across dimensions like difficulty, workload, grading, prerequisites, schedule, and professor ratings. Helps students choose between similar courses.',
      parameters: {
        type: 'object',
        properties: {
          course_codes: { type: 'array', items: { type: 'string' }, description: 'List of course codes to compare, for example ["CSCI-UA 480", "CSCI-UA 473"].' },
          compare_aspects: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional aspects to compare: difficulty, workload, grading, prerequisites, schedule, professor. If not specified, compare all aspects.'
          },
        },
        required: ['course_codes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_professor_info',
      description: 'Get professor information including teaching style, grading, difficulty rating, and student reviews. Useful when students want to know about a specific professor.',
      parameters: {
        type: 'object',
        properties: {
          professor_name: { type: 'string', description: 'Professor name, for example "Ernest Davis".' },
          course_code: { type: 'string', description: 'Optional course code to get professor info for that specific course.' },
        },
        required: ['professor_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_workload',
      description: 'Estimate the total workload of a course schedule (weekly hours, difficulty score) and determine if it is light, moderate, heavy, or overload. Considers student background.',
      parameters: {
        type: 'object',
        properties: {
          course_codes: { type: 'array', items: { type: 'string' }, description: 'List of course codes in the schedule.' },
          student_id: { type: 'string', description: 'Student id to consider their background and completed courses.' },
        },
        required: ['course_codes', 'student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_study_away_restrictions',
      description: 'Query Study Away course selection restrictions for a specific major or course. Returns rules like "must complete X courses in Shanghai" or "max Y electives during Study Away".',
      parameters: {
        type: 'object',
        properties: {
          major: { type: 'string', description: 'Major name, for example "Computer Science".' },
          course_code: { type: 'string', description: 'Optional course code to check if it has Study Away restrictions.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_course_history',
      description: 'Get historical enrollment data for a course (past terms, seat availability, waitlist status). Helps predict if a course will be offered and how competitive it is.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code, for example CSCI-UA 480.' },
          terms: { type: 'number', description: 'Number of past terms to query, default 3.' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_backup_courses',
      description: 'Suggest backup courses when the target course is unavailable (seats full, time conflict, missing prerequisites, too difficult). Returns similar courses that satisfy the same requirements.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Target course code that is unavailable.' },
          reason: {
            type: 'string',
            description: 'Reason for needing backup: seats_full, time_conflict, prerequisite_missing, difficulty_too_high.'
          },
          student_id: { type: 'string', description: 'Student id to check eligibility for backup courses.' },
        },
        required: ['course_code', 'student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_community_reviews',
      description: 'Get student reviews and ratings for a course from the community. Includes difficulty, workload, professor feedback, and personal experiences from students who took the course.',
      parameters: {
        type: 'object',
        properties: {
          course_code: { type: 'string', description: 'Course code, for example CSCI-UA 480.' },
          sort_by: { type: 'string', description: 'Optional sort order: recent, helpful, rating. Default is helpful.' },
          min_rating: { type: 'number', description: 'Optional minimum rating filter (1-5).' },
        },
        required: ['course_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_community_tips',
      description: 'Get community tips and advice for Study Away, course selection, or specific topics. Tips are shared experiences from students.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Tip category: study_away, course_selection, registration, time_management, professor_advice, general. If not specified, return all categories.'
          },
          keyword: { type: 'string', description: 'Optional keyword to search tips.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_community_experiences',
      description: 'Search community for specific experiences or questions. For example, "纽约哪节课特别有意思" or "CSCI-UA 480难不难".',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, for example "纽约有意思的课" or "机器学习难度".' },
          limit: { type: 'number', description: 'Maximum number of results, default 5.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulate_future_semesters',
      description: 'Simulate the impact of course selection on future 4 semesters. Predicts GPA, workload, graduation progress, and provides optimization suggestions. This is the "time travel" feature.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
          current_term: { type: 'string', description: 'Current term, for example Fall 2026.' },
          course_plan: {
            type: 'object',
            description: 'Course plan for current and future semesters. Format: {"Fall 2026": ["CSCI-UA 480", "CSCI-UA 473"], "Spring 2027": [...]}',
          },
        },
        required: ['student_id', 'current_term', 'course_plan'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_minor_opportunities',
      description: 'Analyze student completed courses to detect potential minor opportunities. For example, if student has taken 2-3 IMA courses, suggest completing IMA minor. Use this to be proactive about graduation planning.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string', description: 'Student id, for example yl8888.' },
        },
        required: ['student_id'],
      },
    },
  },
];
