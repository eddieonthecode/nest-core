import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import {
  ILoggingStrategy,
  LogEntry,
  LogLevel,
} from "../interfaces/logging-strategy.interface";

/**
 * Example database logging strategy.
 * Saves log entries to a database table for persistent storage and querying.
 *
 * Note: This is an example implementation. You'll need to create the actual
 * LogEntity and configure it properly in your TypeORM setup.
 *
 * @example
 * ```typescript
 * // First, create your log entity
 * @Entity('logs')
 * export class LogEntity {
 *   @PrimaryGeneratedColumn('uuid')
 *   id: string;
 *
 *   @Column({ type: 'enum', enum: LogLevel })
 *   level: LogLevel;
 *
 *   @Column('text')
 *   message: string;
 *
 *   @Column({ type: 'timestamp' })
 *   timestamp: Date;
 *
 *   @Column({ nullable: true })
 *   context: string;
 *
 *   @Column({ type: 'json', nullable: true })
 *   metadata: Record<string, any>;
 *
 *   @Column({ type: 'text', nullable: true })
 *   stack: string;
 * }
 *
 * // Then use the strategy
 * @Injectable()
 * export class DatabaseLoggingStrategy implements ILoggingStrategy {
 *   constructor(
 *     @InjectRepository(LogEntity)
 *     private logRepository: Repository<LogEntity>
 *   ) {}
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     try {
 *       await this.logRepository.save({
 *         level: entry.level,
 *         message: entry.message,
 *         timestamp: entry.timestamp,
 *         context: entry.context,
 *         metadata: entry.metadata,
 *         stack: entry.stack
 *       });
 *     } catch (error) {
 *       // Fallback to console logging if database fails
 *       console.error('Failed to save log to database:', error);
 *       console.log('Original log entry:', entry);
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class DatabaseLoggingStrategy implements ILoggingStrategy {
  constructor(
    // @InjectRepository(LogEntity) // Uncomment when you have LogEntity
    private logRepository: Repository<any>, // Replace 'any' with your LogEntity type
  ) {}

  /**
   * Saves log entry to database.
   * Includes error handling to prevent logging failures from breaking the application.
   *
   * @param entry - The log entry to save
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      await this.logRepository.save({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        context: entry.context,
        metadata: entry.metadata,
        stack: entry.stack,
      });
    } catch (error) {
      // Fallback to console logging if database fails
      console.error("Failed to save log to database:", error);
      console.log("Original log entry:", entry);
    }
  }
}

/**
 * Example file logging strategy.
 * Writes log entries to log files with rotation based on date and size.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class FileLoggingStrategy implements ILoggingStrategy {
 *   private logDir = './logs';
 *   private maxFileSize = 10 * 1024 * 1024; // 10MB
 *
 *   constructor() {
 *     this.ensureLogDirectory();
 *   }
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     const logFile = this.getLogFileName(entry.level);
 *     const logLine = this.formatLogEntry(entry);
 *
 *     await this.appendToFile(logFile, logLine);
 *     await this.rotateLogFileIfNeeded(logFile);
 *   }
 *
 *   private formatLogEntry(entry: LogEntry): string {
 *     return JSON.stringify({
 *       timestamp: entry.timestamp.toISOString(),
 *       level: entry.level,
 *       context: entry.context,
 *       message: entry.message,
 *       metadata: entry.metadata
 *     }) + '\n';
 *   }
 * }
 * ```
 */
@Injectable()
export class FileLoggingStrategy implements ILoggingStrategy {
  private logDir = "./logs";
  private maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.ensureLogDirectory();
  }

  /**
   * Writes log entry to appropriate log file.
   * Organizes logs by level and date with automatic rotation.
   *
   * @param entry - The log entry to write
   */
  async log(entry: LogEntry): Promise<void> {
    const logFile = this.getLogFileName(entry.level);
    const logLine = this.formatLogEntry(entry);

    await this.appendToFile(logFile, logLine);
    await this.rotateLogFileIfNeeded(logFile);
  }

  private ensureLogDirectory(): void {
    const fs = require("fs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `${this.logDir}/${level}-${date}.log`;
  }

  private formatLogEntry(entry: LogEntry): string {
    return (
      JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        context: entry.context,
        message: entry.message,
        metadata: entry.metadata,
      }) + "\n"
    );
  }

  private async appendToFile(filename: string, content: string): Promise<void> {
    const fs = require("fs").promises;
    await fs.appendFile(filename, content);
  }

  private async rotateLogFileIfNeeded(filename: string): Promise<void> {
    const fs = require("fs");
    try {
      const stats = fs.statSync(filename);
      if (stats.size > this.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rotatedName = filename.replace(".log", `-${timestamp}.log`);
        fs.renameSync(filename, rotatedName);
      }
    } catch (error) {
      // File doesn't exist or other error, ignore
    }
  }
}

/**
 * Example queue-based logging strategy.
 * Sends log entries to a message queue for asynchronous processing.
 * Useful for high-throughput applications and microservices architecture.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class QueueLoggingStrategy implements ILoggingStrategy {
 *   constructor(
 *     private queueService: QueueService, // Your queue service
 *     private queueName = 'logs'
 *   ) {}
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     try {
 *       await this.queueService.send(this.queueName, {
 *         ...entry,
 *         timestamp: entry.timestamp.toISOString(),
 *         service: process.env.SERVICE_NAME || 'unknown'
 *       });
 *     } catch (error) {
 *       // Fallback to console if queue fails
 *       console.error('Failed to send log to queue:', error);
 *       console.log('Original log entry:', entry);
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class QueueLoggingStrategy implements ILoggingStrategy {
  constructor(
    private queueService: any, // Replace with your queue service type
    private queueName = "logs",
  ) {}

  /**
   * Sends log entry to message queue for asynchronous processing.
   * Includes fallback to console logging if queue is unavailable.
   *
   * @param entry - The log entry to queue
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      await this.queueService.send(this.queueName, {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        service: process.env.SERVICE_NAME || "unknown",
      });
    } catch (error) {
      // Fallback to console if queue fails
      console.error("Failed to send log to queue:", error);
      console.log("Original log entry:", entry);
    }
  }
}

/**
 * Example external service logging strategy.
 * Sends logs to external logging services like ELK stack, Splunk, or cloud providers.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ExternalServiceLoggingStrategy implements ILoggingStrategy {
 *   constructor(
 *     private httpClient: HttpClient,
 *     private endpoint = 'https://logs.example.com/api/logs'
 *   ) {}
 *
 *   async log(entry: LogEntry): Promise<void> {
 *     try {
 *       await this.httpClient.post(this.endpoint, {
 *         ...entry,
 *         timestamp: entry.timestamp.toISOString(),
 *         source: process.env.HOSTNAME || 'unknown',
 *         environment: process.env.NODE_ENV || 'development'
 *       });
 *     } catch (error) {
 *       // Fallback to console if external service fails
 *       console.error('Failed to send log to external service:', error);
 *       console.log('Original log entry:', entry);
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class ExternalServiceLoggingStrategy implements ILoggingStrategy {
  constructor(
    private httpClient: any, // Replace with your HTTP client type
    private endpoint = "https://logs.example.com/api/logs",
  ) {}

  /**
   * Sends log entry to external logging service.
   * Includes service metadata and fallback handling.
   *
   * @param entry - The log entry to send
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      await this.httpClient.post(this.endpoint, {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        source: process.env.HOSTNAME || "unknown",
        environment: process.env.NODE_ENV || "development",
      });
    } catch (error) {
      // Fallback to console if external service fails
      console.error("Failed to send log to external service:", error);
      console.log("Original log entry:", entry);
    }
  }
}
