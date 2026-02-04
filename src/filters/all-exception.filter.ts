import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Optional,
} from "@nestjs/common";
import { ResponseUtil } from "../models";
import {
  ILoggingStrategy,
  LogEntry,
  LogLevel,
  DefaultLoggingStrategy,
} from "../interfaces/logging-strategy.interface";
import { InjectLogging } from "src/modules";

/**
 * Global exception filter that catches all exceptions and transforms them
 * into standardized API error responses.
 *
 * This filter handles:
 * - HttpException (including validation errors)
 * - Standard JavaScript Errors
 * - Unknown exceptions
 *
 * Logging is handled through an injectable strategy pattern, allowing
 * users to implement their own logging approaches (console, database, queue, etc.).
 *
 * @example
 * ```typescript
 * // Apply globally with custom logging strategy
 * app.useGlobalFilters(new AllExceptionsFilter(new DatabaseLoggingStrategy()));
 *
 * // Or apply to specific modules with dependency injection
 * @Module({
 *   providers: [
 *     { provide: APP_FILTER, useClass: AllExceptionsFilter },
 *     { provide: 'LoggingStrategy', useClass: DatabaseLoggingStrategy }
 *   ]
 * })
 * export class AppModule {}
 *
 * // Use composite logging for multiple destinations
 * const compositeStrategy = new CompositeLoggingStrategy([
 *   new ConsoleLoggingStrategy(),
 *   new DatabaseLoggingStrategy(logRepository)
 * ]);
 * app.useGlobalFilters(new AllExceptionsFilter(compositeStrategy));
 * ```
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private loggingStrategy: ILoggingStrategy;

  /**
   * Creates an instance of AllExceptionsFilter.
   *
   * @param loggingStrategy - Optional custom logging strategy.
   * If not provided, uses DefaultLoggingStrategy (NestJS console logger).
   * Can be injected via dependency injection using 'LoggingStrategy' token.
   */
  constructor(@Optional() @InjectLogging() loggingStrategy?: ILoggingStrategy) {
    this.loggingStrategy = loggingStrategy || new DefaultLoggingStrategy();
  }

  /**
   * Catches and processes all exceptions, transforming them into
   * standardized error responses and logging them using the configured strategy.
   *
   * @param exception - The caught exception
   * @param host - The execution context host
   */
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let status: HttpStatus;
    let message: string;
    let error: string;
    let details: any;
    let logLevel: LogLevel;

    // Handle HttpException (including validation errors, 404, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === "string") {
        message = responseBody;
        error = HttpStatus[status];
      } else if (typeof responseBody === "object" && responseBody !== null) {
        message = (responseBody as any).message || "Http Exception";
        error = (responseBody as any).error || HttpStatus[status];
        details = (responseBody as any).details || (responseBody as any).data;
      } else {
        message = "Http Exception";
        error = HttpStatus[status];
      }

      // Determine log level based on status code
      logLevel = this.getLogLevelFromStatus(status);

      // Create log entry for HTTP exception
      const logEntry: LogEntry = {
        level: logLevel,
        message: `HttpException caught: ${request.method} ${request.url} - Status: ${status}, Message: ${message}`,
        timestamp: new Date(),
        context: "AllExceptionsFilter",
        error: exception instanceof Error ? exception : undefined,
        stack: exception instanceof Error ? exception.stack : undefined,
        metadata: {
          method: request.method,
          url: request.url,
          status,
          httpError: error,
          details,
        },
      };

      await this.loggingStrategy.log(logEntry);
    }
    // Handle standard JavaScript Errors
    else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal Server Error";
      error = "Internal Server Error";
      logLevel = LogLevel.ERROR;

      details = {
        name: exception.name,
        message: exception.message,
        stack:
          process.env.NODE_ENV === "development" ? exception.stack : undefined, // Only show stack in development
      };

      // Create log entry for JavaScript Error
      const logEntry: LogEntry = {
        level: logLevel,
        message: `Unhandled Error caught: ${request.method} ${request.url} - Message: ${exception.message}`,
        timestamp: new Date(),
        context: "AllExceptionsFilter",
        error: exception,
        stack: exception.stack,
        metadata: {
          method: request.method,
          url: request.url,
          errorName: exception.name,
          errorMessage: exception.message,
        },
      };

      await this.loggingStrategy.log(logEntry);
    }
    // Handle unknown exceptions
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "An unexpected error occurred";
      error = "Unknown Error";
      logLevel = LogLevel.FATAL;

      // Create log entry for unknown exception
      const logEntry: LogEntry = {
        level: logLevel,
        message: `Unknown exception caught: ${request.method} ${request.url}`,
        timestamp: new Date(),
        context: "AllExceptionsFilter",
        error: exception instanceof Error ? exception : undefined,
        metadata: {
          method: request.method,
          url: request.url,
          exceptionType: typeof exception,
          exceptionString: String(exception),
        },
      };

      await this.loggingStrategy.log(logEntry);
    }

    response
      .status(status)
      .json(ResponseUtil.error(request, status, message, error, details));
  }

  /**
   * Determines the appropriate log level based on HTTP status code.
   *
   * @param status - HTTP status code
   * @returns Appropriate log level
   */
  private getLogLevelFromStatus(status: HttpStatus): LogLevel {
    if (status >= 500) {
      return LogLevel.ERROR;
    } else if (status >= 400) {
      return LogLevel.WARN;
    } else {
      return LogLevel.INFO;
    }
  }
}
