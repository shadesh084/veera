import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory fallback store used exclusively when Supabase credentials
 * are unconfigured in local development. Enables instant dev testing and onboarding.
 */
class InMemoryStore {
  constructor() {
    this.profiles = new Map();
    this.subjects = new Map();
    this.assessments = new Map();
    this.studyPlans = new Map();

    // Seed default demo student
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    this.profiles.set(defaultUserId, {
      id: defaultUserId,
      display_name: 'Alex Rivera',
      academic_level: 'Undergraduate Computer Science',
      institution_name: 'Metro State University',
      target_percentage: 85.0,
      created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    });

    const mathId = '11111111-1111-1111-1111-111111111111';
    const physicsId = '22222222-2222-2222-2222-222222222222';
    const csId = '33333333-3333-3333-3333-333333333333';

    this.subjects.set(mathId, {
      id: mathId,
      user_id: defaultUserId,
      name: 'Advanced Calculus',
      subject_code: 'MATH-201',
      description: 'Multivariable calculus, linear algebra, vector spaces',
      target_percentage: 85.0,
      color: 'indigo',
      created_at: new Date('2026-09-02T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-02T10:00:00Z').toISOString(),
    });

    this.subjects.set(physicsId, {
      id: physicsId,
      user_id: defaultUserId,
      name: 'Quantum Physics',
      subject_code: 'PHYS-302',
      description: 'Wave mechanics, Schrödinger equations, quantum harmonic oscillators',
      target_percentage: 80.0,
      color: 'cyan',
      created_at: new Date('2026-09-03T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-03T10:00:00Z').toISOString(),
    });

    this.subjects.set(csId, {
      id: csId,
      user_id: defaultUserId,
      name: 'Data Structures & Algorithms',
      subject_code: 'CS-204',
      description: 'Graph algorithms, dynamic programming, algorithmic complexity',
      target_percentage: 90.0,
      color: 'emerald',
      created_at: new Date('2026-09-04T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-04T10:00:00Z').toISOString(),
    });

    // Seed realistic assessments
    const seedAssessments = [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        user_id: defaultUserId,
        subject_id: csId,
        title: 'Binary Trees & Graphs Quiz',
        assessment_type: 'Quiz',
        assessment_date: '2026-09-15',
        marks_obtained: 19.0,
        max_marks: 20.0,
        remarks: 'Strong understanding of BFS and DFS traversals.',
      },
      {
        id: 'a2222222-2222-2222-2222-222222222222',
        user_id: defaultUserId,
        subject_id: csId,
        title: 'Dynamic Programming Project',
        assessment_type: 'Project',
        assessment_date: '2026-10-02',
        marks_obtained: 95.0,
        max_marks: 100.0,
        remarks: 'Optimal memoization implementation and clean code.',
      },
      {
        id: 'a3333333-3333-3333-3333-333333333333',
        user_id: defaultUserId,
        subject_id: mathId,
        title: 'Differential Equations Unit Test',
        assessment_type: 'Unit Test',
        assessment_date: '2026-09-20',
        marks_obtained: 41.0,
        max_marks: 50.0,
        remarks: 'Minor algebraic errors in second-order ODE reduction.',
      },
      {
        id: 'a4444444-4444-4444-4444-444444444444',
        user_id: defaultUserId,
        subject_id: mathId,
        title: 'Calculus Midterm Examination',
        assessment_type: 'Midterm Examination',
        assessment_date: '2026-10-10',
        marks_obtained: 88.0,
        max_marks: 100.0,
        remarks: 'Great recovery on Laplace transforms.',
      },
      {
        id: 'a5555555-5555-5555-5555-555555555555',
        user_id: defaultUserId,
        subject_id: physicsId,
        title: 'Photoelectric Effect Lab Practical',
        assessment_type: 'Practical',
        assessment_date: '2026-09-25',
        marks_obtained: 28.0,
        max_marks: 30.0,
        remarks: 'Accurate Planck constant determination.',
      },
      {
        id: 'a6666666-6666-6666-6666-666666666666',
        user_id: defaultUserId,
        subject_id: physicsId,
        title: 'Wave Mechanics Assignment',
        assessment_type: 'Assignment',
        assessment_date: '2026-10-18',
        marks_obtained: 34.0,
        max_marks: 50.0,
        remarks: 'Need revision on 1D infinite potential well boundary conditions.',
      },
    ];

    for (const a of seedAssessments) {
      this.assessments.set(a.id, {
        ...a,
        created_at: new Date(a.assessment_date).toISOString(),
        updated_at: new Date(a.assessment_date).toISOString(),
      });
    }

    // Seed study plan
    const planId = 'p1111111-1111-1111-1111-111111111111';
    this.studyPlans.set(planId, {
      id: planId,
      user_id: defaultUserId,
      title: 'Quantum Physics & Calculus Reinforcement',
      description: 'Focused weekly revision on wave mechanics boundary conditions and vector calculus integration.',
      start_date: '2026-10-25',
      end_date: '2026-10-31',
      status: 'active',
      tasks: [
        {
          id: 't1',
          title: 'Review Schrödinger 1D Well boundary conditions',
          description: 'Re-derive wavefunctions and calculate normalization constants.',
          estimated_minutes: 60,
          priority: 'high',
          completed: false,
          subject_name: 'Quantum Physics',
        },
        {
          id: 't2',
          title: 'Practice 10 surface integral calculus problems',
          description: "Chapter 14 practice exercises from Stewart's Calculus.",
          estimated_minutes: 90,
          priority: 'medium',
          completed: true,
          subject_name: 'Advanced Calculus',
        },
        {
          id: 't3',
          title: 'Review dynamic programming edge cases for Dijkstra',
          description: 'Analyze time complexity trade-offs for Fibonacci heaps.',
          estimated_minutes: 45,
          priority: 'low',
          completed: false,
          subject_name: 'Data Structures & Algorithms',
        },
      ],
      created_at: new Date('2026-10-25T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-25T08:00:00Z').toISOString(),
    });
  }
}

export const inMemoryStore = new InMemoryStore();

export const isSupabaseLive = () => {
  return Boolean(
    config.supabase.url &&
    !config.supabase.url.includes('placeholder') &&
    config.supabase.serviceRoleKey &&
    !config.supabase.serviceRoleKey.includes('placeholder')
  );
};
