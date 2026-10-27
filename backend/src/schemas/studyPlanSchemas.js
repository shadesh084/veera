import { z } from 'zod';

export const studyPlanTaskSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z
    .string({ required_error: 'Task title is required' })
    .trim()
    .min(1, 'Task title cannot be blank')
    .max(200, 'Task title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Task description must not exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  estimated_minutes: z.coerce
    .number()
    .int('Minutes must be a whole number')
    .positive('Estimated minutes must be positive')
    .max(1440, 'Estimated minutes cannot exceed 1440 (24 hours)')
    .default(45),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  completed: z.boolean().default(false),
  subject_name: z.string().trim().max(100).optional().nullable(),
});

export const createStudyPlanSchema = z
  .object({
    title: z
      .string({ required_error: 'Study plan title is required' })
      .trim()
      .min(1, 'Title cannot be blank')
      .max(150, 'Title must not exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    start_date: z
      .string({ required_error: 'Start date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
    end_date: z
      .string({ required_error: 'End date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
    status: z.enum(['active', 'completed', 'archived']).default('active'),
    tasks: z.array(studyPlanTaskSchema).default([]),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

export const updateStudyPlanSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : null)),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((val) => !isNaN(Date.parse(val)))
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((val) => !isNaN(Date.parse(val)))
      .optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    tasks: z.array(studyPlanTaskSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  );
