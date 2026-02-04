import { HttpStatus } from "@nestjs/common";

/**
 * API success response
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Response util
 */
export class ResponseUtil {
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
