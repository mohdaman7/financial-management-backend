export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ResponseFormatter {
  /**
   * Format a successful API response.
   *
   * @param data The payload data returned by the API
   * @param meta Optional metadata (e.g. pagination)
   */
  static success<T>(data: T, meta?: unknown): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success: true,
      data,
    };

    if (meta !== undefined && meta !== null) {
      response.meta = meta as Record<string, unknown>;
    }

    return response;
  }

  /**
   * Format an error API response.
   *
   * @param message Description of the error
   * @param code A specific string identifier for the error
   * @param details Additional error details or validation failures
   */
  static error(
    message: string,
    code = 'INTERNAL_ERROR',
    details: unknown = [],
  ): ApiResponse<never> {
    return {
      success: false,
      message,
      error: {
        code,
        message,
        details,
      },
    };
  }
}
