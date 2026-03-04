/**
 * Error handling utilities for triage-mirror-stateless API endpoints
 * Provides consistent error responses, logging, and monitoring integration
 */

export interface ErrorContext {
  user_id?: string;
  anchor_id?: string;
  block_id?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  context?: ErrorContext;
}

/**
 * Log error with context for debugging and monitoring
 */
export function logError(error: Error, context: ErrorContext = {}): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Triage Error]', logEntry);
  } else {
    // In production, log to monitoring service
    // Example: sendToMonitoring(logEntry);
    console.error('[Triage Error]', {
      message: error.message,
      context,
    });
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | string,
  status: number = 500,
  context?: ErrorContext,
): ErrorResponse {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorName = typeof error === 'string' ? 'Error' : error.name;

  return {
    error: errorName,
    message: errorMessage,
    status,
    context: process.env.NODE_ENV === 'development' ? context : undefined,
  };
}

/**
 * Handle API endpoint errors with consistent logging and response format
 */
export function handleApiError(
  error: unknown,
  context: ErrorContext = {},
): { response: ErrorResponse; status: number } {
  // Handle known error types
  if (error instanceof Error) {
    logError(error, context);

    // Database errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return {
        response: createErrorResponse('Resource already exists', 409, context),
        status: 409,
      };
    }

    // Not found errors
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return {
        response: createErrorResponse(error.message, 404, context),
        status: 404,
      };
    }

    // Validation errors
    if (
      error.message.includes('invalid') ||
      error.message.includes('required') ||
      error.message.includes('must be')
    ) {
      return {
        response: createErrorResponse(error.message, 400, context),
        status: 400,
      };
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return {
        response: createErrorResponse('Request timed out', 408, context),
        status: 408,
      };
    }

    // Generic error
    return {
      response: createErrorResponse(error, 500, context),
      status: 500,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    const err = new Error(error);
    logError(err, context);
    return {
      response: createErrorResponse(err, 500, context),
      status: 500,
    };
  }

  // Handle unknown errors
  const unknownError = new Error('An unknown error occurred');
  logError(unknownError, { ...context, originalError: error });
  return {
    response: createErrorResponse(unknownError, 500, context),
    status: 500,
  };
}

/**
 * Wrap async API handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: ErrorContext = {},
): Promise<{ data?: T; error?: { response: ErrorResponse; status: number } }> {
  return handler()
    .then((data) => ({ data }))
    .catch((error) => ({ error: handleApiError(error, context) }));
}

/**
 * Validate required fields in request body
 */
export function validateRequired(
  body: Record<string, unknown>,
  requiredFields: string[],
): { valid: boolean; error?: ErrorResponse } {
  const missingFields = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: createErrorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        { missingFields },
      ),
    };
  }

  return { valid: true };
}

/**
 * Graceful fallback handler for optional operations
 */
export function withFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  context: ErrorContext = {},
): Promise<T> {
  return operation().catch((error) => {
    logError(
      error instanceof Error ? error : new Error(String(error)),
      { ...context, fallback: true },
    );
    return fallbackValue;
  });
}
