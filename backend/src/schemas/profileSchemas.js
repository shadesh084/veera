import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Display name cannot be blank')
    .max(100, 'Display name must not exceed 100 characters')
    .optional(),
  academic_level: z
    .string()
    .trim()
    .max(100, 'Academic level must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  institution_name: z
    .string()
    .trim()
    .max(150, 'Institution name must not exceed 150 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  target_percentage: z.coerce
    .number()
    .min(0, 'Target percentage cannot be negative')
    .max(100, 'Target percentage cannot exceed 100')
    .optional()
    .nullable(),
});
