/**
 * Utility functions for validation and error handling
 */

/**
 * Handles Zod validation errors and returns a formatted error object
 * @param result - The result from z.schema.safeParse()
 * @returns Object with error message or null if validation passed
 */
export const handleZodError = <T>(result: z.SafeParseReturnType<T, any>) => {
  if (!result.success && result.error) {
    // Get the first error message if available
    const firstError = result.error.errors[0];
    if (firstError && typeof firstError.message === 'string') {
      return { error: firstError.message };
    }
    // Fallback if we can't get a specific message
    return { error: "Invalid input" };
  }
  // Validation passed
  return null;
};

/**
 * Validates that required fields are present in an object
 * @param data - The object to validate
 * @param fields - Array of field names that are required
 * @returns Error message if validation fails, null if passed
 */
export const validateRequiredFields = (data: Record<string, any>, fields: string[]): string | null => {
  for (const field of fields) {
    if (!data[field] && data[field] !== 0) { // Allow 0 as valid value
      return `${field} is required`;
    }
  }
  return null;
};

/**
 * Validates that a value is one of the allowed enum values
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error message
 * @returns Error message if validation fails, null if passed
 */
export const validateEnumValue = <T>(
  value: T | undefined | null,
  allowedValues: T[],
  fieldName: string
): string | null => {
  if (value === undefined || value === null) {
    return null; // Allow undefined/null (optional fields)
  }

  if (!allowedValues.includes(value as T)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }

  return null;
};