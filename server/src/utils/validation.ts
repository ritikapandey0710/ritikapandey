import { z } from "zod";

/**
 * Utility functions for validation and error handling
 */

/**
 * Handles Zod validation errors and returns a formatted error object
 * @param result - The result from z.schema.safeParse()
 * @returns Object with error message or null if validation passed
 */
export const handleZodError = <T>(result: z.ZodSafeParseResult<T>) => {
  if (!result.success) {
    // Try to get error message from Zod error
    let errorMessage = "Invalid input";
    
    if (result.error) {
      // Try to get the first error message
      if (result.error.issues && Array.isArray(result.error.issues) && result.error.issues.length > 0) {
        const firstIssue = result.error.issues[0];
        if (firstIssue && typeof firstIssue.message === 'string') {
          errorMessage = firstIssue.message;
        }
      }
      // Fallback to toString() if available
      else if (typeof result.error.toString === 'function') {
        errorMessage = result.error.toString();
      }
      // Last resort
      else if (result.error.message) {
        errorMessage = String(result.error.message);
      }
    }
    
    return { error: errorMessage };
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
