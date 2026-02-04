import { DynamicModule, Inject, Module, Provider } from "@nestjs/common";
import {
  ILoggingStrategy,
  DefaultLoggingStrategy,
} from "../interfaces/logging-strategy.interface";

/**
 * Configuration options for the logging module.
 */
export interface LoggingModuleOptions {
  /**
   * Custom logging strategy implementation.
   * If not provided, uses DefaultLoggingStrategy (NestJS console logger).
   */
  strategy?: ILoggingStrategy;

  /**
   * Whether to provide the logging strategy globally.
   * When true, the strategy can be injected using @InjectLogging() decorator.
   * Default: true
   */
  global?: boolean;
}

const LOGGING_STRATEGY_TOKEN = "LoggingStrategy";

export function InjectLogging(): ParameterDecorator {
  return Inject(LOGGING_STRATEGY_TOKEN);
}

/**
 * Dynamic module for configuring logging strategies.
 * Provides dependency injection setup for custom logging implementations.
 *
 * @example
 * ```typescript
 * // Basic usage with default logging
 * @Module({
 *   imports: [LoggingModule.forRoot()]
 * })
 * export class AppModule {}
 *
 * // With custom logging strategy
 * @Module({
 *   imports: [LoggingModule.forRoot({
 *     strategy: new DatabaseLoggingStrategy(logRepository)
 *   })]
 * })
 * export class AppModule {}
 *
 * // With async configuration
 * @Module({
 *   imports: [LoggingModule.forRootAsync({
 *     useFactory: (logRepository: LogRepository) => ({
 *       strategy: new DatabaseLoggingStrategy(logRepository)
 *     }),
 *     inject: [LogRepository]
 *   })]
 * })
 * export class AppModule {}
 *
 * // Injection Examples:
 *
 * // Using @InjectLogging() decorator (recommended)
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectLogging()
 *     private loggingStrategy: ILoggingStrategy
 *   ) {}
 * }
 *
 * // Manual injection (not recommended)
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject(LOGGING_STRATEGY_TOKEN)
 *     private loggingStrategy: ILoggingStrategy
 *   ) {}
 * }
 * ```
 */
@Module({})
export class LoggingModule {
  /**
   * Configures the logging module with synchronous options.
   *
   * @param options - Configuration options for the logging module
   * @returns Dynamic module configuration
   */
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    const providers: Provider[] = this.createProviders(options);

    return {
      module: LoggingModule,
      providers,
      exports: providers,
      global: options.global !== false, // Default to true
    };
  }

  /**
   * Configures the logging module with asynchronous options.
   * Useful when the logging strategy depends on other services.
   *
   * @param options - Async configuration options
   * @returns Dynamic module configuration
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<LoggingModuleOptions> | LoggingModuleOptions;
    inject?: any[];
    global?: boolean;
  }): DynamicModule {
    const loggingStrategyProvider: Provider = {
      provide: LOGGING_STRATEGY_TOKEN,
      useFactory: async (...args: any[]) => {
        const moduleOptions = await options.useFactory(...args);
        return moduleOptions.strategy || new DefaultLoggingStrategy();
      },
      inject: options.inject || [],
    };

    return {
      module: LoggingModule,
      providers: [loggingStrategyProvider],
      exports: [loggingStrategyProvider],
      global: options.global !== false, // Default to true
    };
  }

  /**
   * Creates a providers array based on configuration options.
   *
   * @param options - Configuration options
   * @returns Array of providers
   */
  private static createProviders(options: LoggingModuleOptions): Provider[] {
    const providers: Provider[] = [];

    // Provide the logging strategy if specified
    if (options.strategy) {
      providers.push({
        provide: LOGGING_STRATEGY_TOKEN,
        useValue: options.strategy,
      });
    } else {
      // Provide default strategy as fallback
      providers.push({
        provide: LOGGING_STRATEGY_TOKEN,
        useClass: DefaultLoggingStrategy,
      });
    }

    return providers;
  }
}
