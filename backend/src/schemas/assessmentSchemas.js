import { z } from 'zod';

export const ASSESSMENT_TYPES = [
  'Quiz',
  'Assignment',
  'Unit Test',
  'Midterm Examination',
  'Final Examination',
  'Practical',
  'Project',
  'Other',
];

export const createAssessmentSchema = z
  .object({
    subject_id: z
      .string({ required_error: 'Subject ID is required' })
      .uuid('Invalid subject ID format'),
    title: z
      .string({ required_error: 'Assessment title is required' })
      .trim()
      .min(1, 'Assessment title cannot be blank')
      .max(150, 'Assessment title must not exceed 150 characters'),
    assessment_type: z.enum(ASSESSMENT_TYPES, {
      errorMap: () => ({ message: `Assessment type must be one of: ${ASSESSMENT_TYPES.join(', ')}` }),
    }),
    assessment_date: z
      .string({ required_error: 'Assessment date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Assessment date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid calendar date' }),
    marks_obtained: z.coerce
      .number({ required_error: 'Marks obtained is required' })
      .min(0, 'Marks obtained must be greater than or equal to 0'),
    max_marks: z.coerce
      .number({ required_error: 'Maximum marks is required' })
      .positive('Maximum marks must be greater than 0'),
    remarks: z
      .string()
      .trim()
      .max(1000, 'Remarks cannot exceed 1000 characters')
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
  })
  .refine((data) => data.marks_obtained <= data.max_marks, {
    message: 'Marks obtained cannot exceed maximum possible marks',
    path: ['marks_obtained'],
  });

export const updateAssessmentSchema = z
  .object({
    subject_id: z.string().uuid('Invalid subject ID format').optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Assessment title cannot be blank')
      .max(150, 'Assessment title must not exceed 150 characters')
      .optional(),
    assessment_type: z.enum(ASSESSMENT_TYPES).optional(),
    assessment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Assessment date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid calendar date' })
      .optional(),
    marks_obtained: z.coerce.number().min(0, 'Marks obtained must be greater than or equal to 0').optional(),
    max_marks: z.coerce.number().positive('Maximum marks must be greater than 0').optional(),
    remarks: z
      .string()
      .trim()
      .max(1000, 'Remarks cannot exceed 1000 characters')
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
  })
  .refine(
    (data) => {
      if (data.marks_obtained !== undefined && data.max_marks !== undefined) {
        return data.marks_obtained <= data.max_marks;
      }
      return true;
    },
    {
      message: 'Marks obtained cannot exceed maximum possible marks',
      path: ['marks_obtained'],
    }
  );

export const queryAssessmentSchema = z.object({
  subject_id: z.string().uuid().optional(),
  assessment_type: z.enum(ASSESSMENT_TYPES).optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().trim().max(100).optional(),
  sort_by: z.enum(['assessment_date', 'marks_obtained', 'title', 'created_at']).default('assessment_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
