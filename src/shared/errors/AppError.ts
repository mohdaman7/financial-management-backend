export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }
}
