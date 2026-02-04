import { HttpStatus } from "@nestjs/common";

/**
 * Standard API success response format.
 * This interface defines the consistent structure for all successful API responses.
 *
 * @example
 * ```typescript
 * {
 *   statusCode: 200,
 *   message: "Success",
 *   data: { users: [] },
 *   timestamp: "2024-01-01T00:00:00.000Z",
 *   path: "/api/users"
 * }
 * ```
 */
export interface ApiResponse<T> {
  /** HTTP status code for the response */
  statusCode: number;
  /** Human-readable message describing the result */
  message: string;
  /** Response payload data (optional) */
  data?: T;
  /** ISO timestamp when the response was generated */
  timestamp: string;
  /** Request path that generated this response */
  path: string;
}

/**
 * Standard API error response format.
 * This interface defines the consistent structure for all error responses.
 *
 * @example
 * ```typescript
 * {
 *   statusCode: 404,
 *   message: "User not found",
 *   error: "Not Found",
 *   timestamp: "2024-01-01T00:00:00.000Z",
 *   path: "/api/users/123",
 *   details: { userId: "123" }
 * }
 * ```
 */
export interface ApiErrorResponse {
  /** HTTP status code for the error */
  statusCode: number;
  /** Human-readable error message */
  message: string;
  /** Error type/category */
  error: string;
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Request path that generated this error */
  path: string;
  /** Additional error details (optional) */
  details?: any;
}

/**
 * Utility class for creating standardized API responses.
 * Provides helper methods to generate consistent success and error responses.
 *
 * @example
 * ```typescript
 * // Success response
 * const success = ResponseUtil.success(request, userData, "User created", HttpStatus.CREATED);
 *
 * // Error response
 * const error = ResponseUtil.error(request, HttpStatus.NOT_FOUND, "User not found", "Not Found");
 * ```
 */
export class ResponseUtil {
  /**
   * Creates a standardized success response.
   *
   * @param request - The HTTP request object
   * @param data - Response payload data (optional)
   * @param message - Success message (default: "Success")
   * @param statusCode - HTTP status code (default: 200 OK)
   * @returns ApiResponse<T> - Standardized success response
   */
  static success<T>(
    request: any,
    data?: T,
    message: string = "Success",
    statusCode: HttpStatus = HttpStatus.OK,
  ): ApiResponse<T> {
    return {
      statusCode: statusCode,
      message: message,
      data: data,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  /**
   * Creates a standardized error response.
   *
   * @param request - The HTTP request object
   * @param statusCode - HTTP status code for the error
   * @param message - Human-readable error message
   * @param error - Error type/category
   * @param details - Additional error details (optional)
   * @returns ApiErrorResponse - Standardized error response
   */
  static error(
    request: any,
    statusCode: HttpStatus,
    message: string,
    error: string,
    details?: any,
  ): ApiErrorResponse {
    return {
      statusCode: statusCode,
      message: message,
      error: error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    };
  }
}
