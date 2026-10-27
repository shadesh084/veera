/**
 * Zod request validation middleware
 * Validates request body, query params, or route params.
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const formattedErrors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code,
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed. Please review the highlighted fields.',
            details: formattedErrors,
          },
        });
      }

      // Replace with sanitized/transformed output
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};
