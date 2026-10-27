import { z } from 'zod';

export const ALLOWED_COLORS = [
  'indigo', 'blue', 'cyan', 'teal', 'emerald', 'green', 'amber', 'orange', 'rose', 'purple', 'slate'
];

export const createSubjectSchema = z.object({
  name: z
    .string({ required_error: 'Subject name is required' })
    .trim()
    .min(1, 'Subject name cannot be blank')
    .max(100, 'Subject name must not exceed 100 characters'),
  subject_code: z
    .string()
    .trim()
    .max(30, 'Subject code must not exceed 30 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  target_percentage: z
    .coerce
    .number()
    .min(0, 'Target percentage must be at least 0')
    .max(100, 'Target percentage cannot exceed 100')
    .optional()
    .nullable(),
  color: z
    .string()
    .refine((val) => ALLOWED_COLORS.includes(val), {
      message: `Color must be one of: ${ALLOWED_COLORS.join(', ')}`,
    })
    .default('blue'),
});

export const updateSubjectSchema = createSubjectSchema.partial();
