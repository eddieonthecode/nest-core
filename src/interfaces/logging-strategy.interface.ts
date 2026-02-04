import { Logger } from "@nestjs/common";
import { SanitizedRequest } from "../models";

/**
 * Log levels for different types of log entries.
 * Maps to standard logging severity levels.
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

/**
 * Log entry containing information about a specific log event.
 * Provides structured data for logging implementations.
 */
export interface LogEntry {
  /**
   * Log level indicating severity of the log entry.
   */
  level: LogLevel;

  /**
   * Log message describing the event.
   */
  message: string;

  /**
   * Timestamp when the log entry was created.
   */
  timestamp: Date;

  /**
   * Optional context information (e.g., class name, module).
   */
  context?: string;

  /**
   * Optional error object for error logs.
   */
  error?: Error;

  /**
   * Optional stack trace for error logs.
   */
  stack?: string;

  /**
   * Optional request information for request-related logs.
   */
  request?: SanitizedRequest;

  /**
   * Additional metadata for the log entry.
   */
  metadata?: Record<string, any>;
}

/**
 * Logging strategy interface for customizable logging implementations.
 * Allows users to implement their own logging strategies (console, database, queue, etc.).
 *
 * This is an INTERFACE (not a class) because:
 * - Multiple, fundamentally different implementations will exist
 * - No shared implementation logic between strategies
 * - We want to define the contract, not provide base functionality
 * - Maximum flexibility for implementers
 *
 * @example
 * ```typescript
 * // Console logging strategy
 * class ConsoleLoggingStrategy implements ILoggingStrategy {
 *   log(entry: LogEntry): void {
 *     console.log(`[${entry.level.toUpperCase()}] ${entry.message}`);
 *   }
 * }
 *
 * // Database logging strategy
 * class DatabaseLoggingStrategy implements ILoggingStrategy {
 *   constructor(private logRepository: Repository<LogEntity>) {}
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     await this.logRepository.save({
 *       level: entry.level,
 *       message: entry.message,
 *       timestamp: entry.timestamp,
 *       metadata: entry.metadata
 *     });
 *   }
 * }
 *
 * // Queue-based logging strategy
 * class QueueLoggingStrategy implements ILoggingStrategy {
 *   constructor(private queueClient: QueueClient) {}
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     await this.queueClient.send('logs-queue', entry);
 *   }
 * }
 * ```
 */
export interface ILoggingStrategy {
  /**
   * Logs a log entry using the implemented strategy.
   * Can be synchronous or asynchronous based on the logging approach.
   *
   * @param entry - The log entry to be logged
   *
   * @example
   * ```typescript
   * // Synchronous logging (console, file)
   * log(entry: LogEntry): void {
   *   console.log(entry.message);
   * }
   *
   * // Asynchronous logging (database, queue, external service)
   * async log(entry: LogEntry): Promise<void> {
   *   await this.database.save(entry);
   * }
   * ```
   */
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * Default logging strategy using NestJS Logger.
 * Provides basic console logging as a fallback implementation.
 */
export class DefaultLoggingStrategy implements ILoggingStrategy {
  private logger = new Logger(DefaultLoggingStrategy.name);

  /**
   * Logs entry using NestJS Logger.
   * Maps log levels to appropriate NestJS logger methods.
   *
   * @param entry - The log entry to log
   */
  log(entry: LogEntry): void {
    const { level, message, context, error, stack } = entry;

    switch (level) {
      case LogLevel.DEBUG:
        this.logger.debug(message, context);
        break;
      case LogLevel.INFO:
        this.logger.log(message, context);
        break;
      case LogLevel.WARN:
        this.logger.warn(message, context, error);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.logger.error(message, stack || error?.stack, context);
        break;
      default:
        this.logger.log(message, context);
    }
  }
}

/**
 * Composite logging strategy that allows multiple logging strategies.
 * Useful for logging to multiple destinations simultaneously.
 *
 * @example
 * ```typescript
 * const compositeStrategy = new CompositeLoggingStrategy([
 *   new ConsoleLoggingStrategy(),
 *   new DatabaseLoggingStrategy(logRepository),
 *   new QueueLoggingStrategy(queueClient)
 * ]);
 * ```
 */
export class CompositeLoggingStrategy implements ILoggingStrategy {
  constructor(private strategies: ILoggingStrategy[]) {}

  /**
   * Logs entry to all configured strategies.
   * Errors in individual strategies don't affect other strategies.
   *
   * @param entry - The log entry to log
   */
  async log(entry: LogEntry): Promise<void> {
    const promises = this.strategies.map(async (strategy) => {
      try {
        await strategy.log(entry);
      } catch (error) {
        // Prevent logging errors from breaking the application
        console.error("Logging strategy failed:", error);
      }
    });

    await Promise.allSettled(promises);
  }
}
