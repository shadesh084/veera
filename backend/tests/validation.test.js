import { describe, it, expect } from 'vitest';
import { createSubjectSchema } from '../src/schemas/subjectSchemas.js';
import { createAssessmentSchema } from '../src/schemas/assessmentSchemas.js';
import { createStudyPlanSchema } from '../src/schemas/studyPlanSchemas.js';

describe('Zod Validation Schemas', () => {
  describe('createSubjectSchema', () => {
    it('passes for valid subject data', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Mathematics',
        subject_code: 'MATH101',
        description: 'Intro to Math',
        target_percentage: 85,
        color: 'indigo',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Mathematics');
      }
    });

    it('rejects empty or blank subject name', () => {
      const result = createSubjectSchema.safeParse({
        name: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid color outside palette', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Physics',
        color: 'neon-pink-invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createAssessmentSchema', () => {
    const validAssessment = {
      subject_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Midterm Exam',
      assessment_type: 'Midterm Examination',
      assessment_date: '2026-10-15',
      marks_obtained: 85,
      max_marks: 100,
    };

    it('passes for valid assessment', () => {
      const result = createAssessmentSchema.safeParse(validAssessment);
      expect(result.success).toBe(true);
    });

    it('fails when marks_obtained > max_marks', () => {
      const result = createAssessmentSchema.safeParse({
        ...validAssessment,
        marks_obtained: 105,
        max_marks: 100,
      });
      expect(result.success).toBe(false);
    });

    it('fails when max_marks <= 0', () => {
      const result = createAssessmentSchema.safeParse({
        ...validAssessment,
        marks_obtained: 0,
        max_marks: 0,
      });
      expect(result.success).toBe(false);
    });

    it('fails when marks_obtained is negative', () => {
      const result = createAssessmentSchema.safeParse({
        ...validAssessment,
        marks_obtained: -10,
        max_marks: 100,
      });
      expect(result.success).toBe(false);
    });

    it('fails for invalid assessment type', () => {
      const result = createAssessmentSchema.safeParse({
        ...validAssessment,
        assessment_type: 'UnknownType',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createStudyPlanSchema', () => {
    it('passes for valid plan with tasks', () => {
      const result = createStudyPlanSchema.safeParse({
        title: 'Weekly Revision',
        start_date: '2026-10-01',
        end_date: '2026-10-07',
        tasks: [
          {
            title: 'Study Chapter 1',
            estimated_minutes: 60,
            priority: 'high',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('fails when end_date precedes start_date', () => {
      const result = createStudyPlanSchema.safeParse({
        title: 'Weekly Revision',
        start_date: '2026-10-10',
        end_date: '2026-10-05',
        tasks: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
