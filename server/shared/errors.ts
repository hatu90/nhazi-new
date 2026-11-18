/** Base class for every error the API deliberately returns. Anything else becomes a 500. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(422, "VALIDATION_FAILED", message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource", code = "FORBIDDEN") {
    super(403, code, message);
  }
}
export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super(404, "NOT_FOUND", `${what} not found`);
  }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(409, code, message);
  }
}
