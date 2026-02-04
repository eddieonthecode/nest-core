# @eddieonthecode/nest-core

A comprehensive package to help build REST APIs faster and more effectively with NestJS and TypeORM.

## Installation

```bash
npm install @eddieonthecode/nest-core
```

## Features

This package provides a complete set of utilities, decorators, entities, and components to accelerate NestJS API development:

- **Base Entities**: Pre-configured TypeORM entities with common fields and audit support
- **Entity Store Service**: Enhanced repository wrapper with advanced CRUD operations
- **Route Decorators**: Simplified decorators for CRUD operations
- **Logging System**: Flexible logging strategies with dependency injection
- **Guards & Filters**: Security and error handling components
- **Interceptors**: Response transformation and request context management
- **Models**: Standardized request/response models and pagination
- **Validators**: Reusable validation components
- **Utilities**: Common helper functions for dates, formatting, and SQL operations
- **Naming Strategy**: Consistent database naming conventions

## Base Entities

Use the base entities for your TypeORM models to get common fields automatically:

```typescript
import { BaseEntity, BaseEntitySoftDelete } from "@eddieonthecode/nest-core";

@Entity("users")
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;
}

@Entity("posts")
export class Post extends BaseEntitySoftDelete {
  @Column()
  title: string;

  @Column()
  content: string;
}
```

**BaseEntity** provides:

- `id`: UUID primary key
- `createdAt`: Creation timestamp
- `createdBy`: User who created the record
- `updatedAt`: Last update timestamp
- `updatedBy`: User who last updated the record

**BaseEntitySoftDelete** extends BaseEntity with:

- `deletedAt`: Soft delete timestamp
- `deletedBy`: User who deleted the record

## Entity Store Service

The EntityStore is a powerful repository wrapper that provides enhanced CRUD operations with built-in support for:

- Advanced search and filtering
- Pagination with optimized queries
- Soft delete operations
- Transaction management
- DTO mapping
- Query building helpers

### Setup

```typescript
import { Module } from "@nestjs/common";
import { EntityStoreModule } from "@eddieonthecode/nest-core";
import { User, Product } from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      entities: [User, Product],
    }),
    EntityStoreModule.forRoot([User, Product]),
  ],
})
export class AppModule {}
```

### Usage in Services

```typescript
import { Injectable } from "@nestjs/common";
import {
  InjectEntityStore,
  EntityStore,
  PaginationRequest,
  FindRequest,
} from "@eddieonthecode/nest-core";
import { User } from "./user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectEntityStore(User)
    private userStore: EntityStore<User>,
  ) {}

  // Basic CRUD operations
  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userStore.createModel(userData);
    return await this.userStore.getRepository().save(user);
  }

  // Advanced search with pagination
  async searchUsers(
    req: PaginationRequest<User>,
  ): Promise<PaginationResponse<User>> {
    return await this.userStore.search(req);
  }

  // Complex filtering
  async findUsers(req: FindRequest<User>): Promise<User[]> {
    return await this.userStore.findBy(req);
  }

  // Transaction support
  async transferData(): Promise<void> {
    return await this.userStore.transaction(async (manager) => {
      // Perform multiple operations in a transaction
      const user1 = await this.userStore
        .getRepository(manager)
        .findOne({ where: { id: "1" } });
      const user2 = await this.userStore
        .getRepository(manager)
        .findOne({ where: { id: "2" } });
      // ... transaction logic
    });
  }

  // DTO mapping
  async getUsersAsDto(): Promise<UserDto[]> {
    const users = await this.userStore.findBy({});
    return this.userStore.mapToDto(users, UserDto);
  }
}
```

### Multiple Data Sources

```typescript
@Injectable()
export class ReportingService {
  constructor(
    @InjectEntityStore(User) // Default data source
    private userStore: EntityStore<User>,

    @InjectEntityStore(Analytics, "analytics") // Named data source
    private analyticsStore: EntityStore<Analytics>,
  ) {}

  async generateReport() {
    const users = await this.userStore.findBy({});
    const analytics = await this.analyticsStore.findBy({});
    return { users, analytics };
  }
}
```

## Route Decorators

Simplify your controller routes with pre-configured decorators:

```typescript
import {
  SearchRoute,
  GetByIdRoute,
  CreateRoute,
  UpdateRoute,
  DeleteByIdRoute,
  RecoverByIdRoute,
  RecycleBinRoute,
  SearchTreeRoute,
  BulkDeleteRoute,
  BulkRecoverRoute,
  SoftDeleteByIdRoute,
  BulkSoftDeleteRoute,
} from "@eddieonthecode/nest-core";

@Controller("users")
export class UserController {
  @SearchRoute()
  searchUsers(@Body() searchDto: SearchDto) {
    // POST /users/search
  }

  @GetByIdRoute()
  getUser(@IdParam() id: string) {
    // GET /users/:id
  }

  @CreateRoute()
  createUser(@Body() createUserDto: CreateUserDto) {
    // POST /users
  }

  @UpdateRoute()
  updateUser(@IdParam() id: string, @Body() updateUserDto: UpdateUserDto) {
    // PATCH /users/:id
  }

  @DeleteByIdRoute()
  deleteUser(@IdParam() id: string) {
    // DELETE /users/:id
  }

  @SoftDeleteByIdRoute()
  softDeleteUser(@IdParam() id: string) {
    // PATCH /users/:id/soft-delete
  }

  @RecoverByIdRoute()
  recoverUser(@IdParam() id: string) {
    // PATCH /users/:id/recover
  }

  @RecycleBinRoute()
  getDeletedUsers(@Body() searchDto: SearchDto) {
    // POST /users/recycle-bin
  }

  @BulkDeleteRoute()
  bulkDeleteUsers(@Body() ids: string[]) {
    // DELETE /users
  }

  @BulkRecoverRoute()
  bulkRecoverUsers(@Body() ids: string[]) {
    // POST /users/recover
  }
}
```

## Logging System

Use the flexible logging system to implement custom logging strategies for your application. The logging system supports multiple approaches including console, database, file, queue, and external service logging.

### Basic Setup with Default Logging

```typescript
import { Module } from "@nestjs/common";
import { LoggingModule } from "@eddieonthecode/nest-core";

@Module({
  imports: [
    LoggingModule.forRoot(), // Uses default NestJS console logging
  ],
})
export class AppModule {}
```

### Custom Logging Strategy

```typescript
import { Module } from "@nestjs/common";
import { LoggingModule, ILoggingStrategy } from "@eddieonthecode/nest-core";

@Injectable()
export class DatabaseLoggingStrategy implements ILoggingStrategy {
  constructor(private logRepository: Repository<LogEntity>) {}

  async log(entry: LogEntry): Promise<void> {
    await this.logRepository.save({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      metadata: entry.metadata,
    });
  }
}

@Module({
  imports: [
    LoggingModule.forRoot({
      strategy: new DatabaseLoggingStrategy(logRepository),
    }),
  ],
})
export class AppModule {}
```

### Using @InjectLogging() Decorator

```typescript
import { Injectable } from "@nestjs/common";
import { InjectLogging, ILoggingStrategy } from "@eddieonthecode/nest-core";

@Injectable()
export class MyService {
  constructor(
    @InjectLogging() // Clean decorator injection
    private loggingStrategy: ILoggingStrategy,
  ) {}

  async someMethod() {
    // Use the injected logging strategy
    this.loggingStrategy.log({
      level: LogLevel.INFO,
      message: "Service method executed",
      timestamp: new Date(),
      context: "MyService",
    });
  }
}
```

### Multiple Logging Strategies

```typescript
import { CompositeLoggingStrategy } from "@eddieonthecode/nest-core";

const compositeStrategy = new CompositeLoggingStrategy([
  new ConsoleLoggingStrategy(),
  new DatabaseLoggingStrategy(logRepository),
  new QueueLoggingStrategy(queueClient),
]);

@Module({
  imports: [
    LoggingModule.forRoot({
      strategy: compositeStrategy,
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { Module } from "@nestjs/common";
import { LoggingModule } from "@eddieonthecode/nest-core";

@Module({
  imports: [
    LoggingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        strategy: new DatabaseLoggingStrategy(configService.getLogRepository()),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Available Logging Strategies

- **DefaultLoggingStrategy**: Uses NestJS built-in Logger for console output
- **DatabaseLoggingStrategy**: Saves logs to database for persistent storage and querying
- **FileLoggingStrategy**: Writes logs to files with automatic rotation based on size and date
- **QueueLoggingStrategy**: Sends logs to message queues for asynchronous processing and microservices
- **CompositeLoggingStrategy**: Combines multiple logging strategies for redundant logging to different destinations

### Configuration Options

```typescript
interface LoggingModuleOptions {
  strategy?: ILoggingStrategy; // Custom logging implementation
  global?: boolean; // Whether to provide globally
}
```

## Guards and Filters

This package provides comprehensive security and error handling components for your NestJS applications.

### RolesGuard - Role-Based Access Control

The `RolesGuard` provides flexible role-based access control using complex role expressions.

```typescript
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { RolesExpression } from "@eddieonthecode/nest-core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private roles: RolesExpression) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return this.evaluateRoles(this.roles, user.roles);
  }

  private evaluateRoles(roles: RolesExpression, userRoles: string[]): boolean {
    // Complex role evaluation logic
    // Supports arrays, AND/OR/NOT operations
    return true; // Implement your role logic
  }
}
```

**Role Expression Examples:**

```typescript
// Simple role array
['admin', 'manager'] // User must have admin OR manager role

// Complex expression
{
  and: [
    ['admin'],
    { or: ['manager', 'auditor'] }
  ]
} // User must be admin AND (manager OR auditor)

// Negation
{ not: ['banned'] } // User must NOT have banned role

// Nested expressions
{
  or: [
    ['admin'],
    { and: [
      { not: ['suspended'] },
      ['auditor']
    ]
  ]
} // Admin OR (not suspended AND auditor)
```

### AllExceptionsFilter - Global Error Handling

The `AllExceptionsFilter` provides comprehensive error handling with automatic logging integration using your configured logging strategy.

```typescript
import { Injectable } from "@nestjs/common";
import { InjectLogging, ILoggingStrategy } from "@eddieonthecode/nest-core";

@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectLogging() // Uses configured logging strategy
    private loggingStrategy: ILoggingStrategy,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let status: HttpStatus;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
    }

    // Automatic logging with rich metadata
    this.loggingStrategy.log({
      level: LogLevel.ERROR,
      message: `Exception: ${message}`,
      timestamp: new Date(),
      context: "AllExceptionsFilter",
      error: exception instanceof Error ? exception : undefined,
      metadata: {
        method: request.method,
        url: request.url,
        userAgent: request.headers["user-agent"],
        ip: request.ip,
        body: request.body,
      },
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Global Application Setup

```typescript
import { NestFactory } from "@nestjs/core";
import { RolesGuard, AllExceptionsFilter } from "@eddieonthecode/nest-core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global guards and filters
  app.useGlobalGuards(new RolesGuard(["admin", "manager"]));
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
```

### Module-Based Configuration

```typescript
import { Module, APP_GUARD, APP_FILTER } from "@nestjs/common";
import { RolesGuard, AllExceptionsFilter } from "@eddieonthecode/nest-core";

@Module({
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

## Interceptors

### Response Interceptor

Transform all responses into a consistent format:

```typescript
import { TransformResponseInterceptor } from "@eddieonthecode/nest-core";

// In your main.ts or module
app.useGlobalInterceptors(new TransformResponseInterceptor());
```

This interceptor transforms responses to:

```typescript
{
  "statusCode": 200,
  "message": "Success",
  "data": { /* your response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users"
}
```

### ControllerResponse

You can also return a `ControllerResponse` for advanced features:

```typescript
import { ControllerResponse } from '@eddieonthecode/nest-core';

@Get()
getUsers(): ControllerResponse<User[]> {
  return {
    data: users,
    message: "Users retrieved successfully",
    statusCode: 200,
    cookies: [{ name: 'token', value: 'abc123', options: { httpOnly: true } }],
    clearCookies: ['old-token']
  };
}
```

### Request Context

Use the request context interceptor to add user information and other context:

```typescript
import { RequestContextInterceptor } from "@eddieonthecode/nest-core";

app.useGlobalInterceptors(new RequestContextInterceptor());
```

### Roles-Based Access Control

Implement role-based authorization with expressive role rules:

```typescript
import { Roles } from '@eddieonthecode/nest-core';

// Simple role check
@Roles(['admin', 'manager'])
@Get('admin-only')
adminRoute() {
  // Accessible by users with 'admin' OR 'manager' role
}

// Complex role expressions
@Roles({ and: [ ['admin'], ['auditor'] ] })
@Get('audit')
auditRoute() {
  // Accessible by users with BOTH 'admin' AND 'auditor' roles
}

@Roles({ not: [ ['banned'] ] })
@Get('public')
publicRoute() {
  // Accessible by users who are NOT banned
}

@Roles({
  or: [
    ['admin'],
    { and: [ ['manager'], { not: [ ['suspended'] ] } ] },
  ],
})
@Get('complex')
complexRoute() {
  // Accessible by admin OR (manager AND not suspended)
}
```

## Models and DTOs

This package provides standardized models for common API operations:

### Request Models

```typescript
import {
  PaginationRequest,
  FindRequest,
  BulkRequest,
  ObjectFilter,
  FindSort,
  FindSearch
} from '@eddieonthecode/nest-core';

// Pagination with search and filtering
@Post('search')
async searchUsers(@Body() req: PaginationRequest<User>) {
  // req.page, req.limit - pagination
  // req.search - text search across multiple fields
  // req.filter - ObjectFilter for complex filtering
  // req.sort - array of sort conditions
  return await this.userService.searchUsers(req);
}

// Simple find without pagination
@Post('find')
async findUsers(@Body() req: FindRequest<User>) {
  // req.search - text search
  // req.filter - ObjectFilter for filtering
  // req.sort - array of sort conditions
  return await this.userService.findUsers(req);
}

// Bulk operations by IDs
@Post('bulk-delete')
async bulkDeleteUsers(@Body() req: BulkRequest) {
  // req.ids - array of string IDs
  return await this.userService.bulkDeleteUsers(req.ids);
}
```

### Filtering Examples

```typescript
// Complex filtering with ObjectFilter
const filter: ObjectFilter<User> = {
  // Basic comparisons
  status: { eq: "active" },
  age: { gt: 18, lt: 65 },

  // Array operations
  tags: { in: ["admin", "moderator"] },

  // Text search with accent support
  name: { contains: "john", useAccent: true },

  // Date ranges
  createdAt: {
    gte: new Date("2024-01-01"),
    lt: new Date("2024-02-01"),
  },

  // Nested object filters
  profile: {
    department: { eq: "engineering" },
  },

  // Combining conditions
  and: [
    { status: { eq: "active" } },
    {
      or: [{ role: { eq: "admin" } }, { permissions: { contains: "manage" } }],
    },
  ],
};
```

### Response Models

```typescript
import {
  PaginationResponse,
  SoftMutationResult,
  BulkSoftMutationResult,
} from "@eddieonthecode/nest-core";

// Pagination response structure
interface PaginatedUsers {
  items: User[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// Soft delete operation result
interface DeleteResult {
  status: "SUCCESS" | "NOT_FOUND" | "NO_OP";
  entity?: User; // The affected entity if successful
}

// Bulk operation result
interface BulkDeleteResult {
  total: number;
  success: User[]; // Successfully processed entities
  noOp: User[]; // Entities that didn't need changes
  notFound: string[]; // IDs that weren't found
}
```

## Validation

Use the provided validators to implement robust data validation for your DTOs and forms.

### Match Validator - Field Comparison

```typescript
import { Match } from "@eddieonthecode/nest-core";

// In your DTO
export class RegisterDto {
  password: string;

  @Match("password", { message: "Passwords do not match" })
  confirmPassword: string;
}
```

## Utilities

Use the utility functions for common operations:

```typescript
import {
  dateUtil,
  formatUtil,
  commonUtil,
  sqlUtil,
} from "@eddieonthecode/nest-core";

// Date utilities
const now = dateUtil.now();
const formatted = dateUtil.format(date, "YYYY-MM-DD");
const startOfDay = dateUtil.startOfDay(new Date());
const endOfDay = dateUtil.endOfDay(new Date());

// Formatting utilities
const snakeCase = formatUtil.camelToSnakeCase("helloWorld");

// Common utilities
const slug = await commonUtil.generateSlug("My Product Title");

// SQL utilities
const truncatedDate = sqlUtil.getTruncatedDateByTimezone(
  "created_at",
  "day",
  "UTC",
);
```

## Database Naming Strategy

Use the CoreNamingStrategy for consistent snake_case database naming:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoreNamingStrategy } from "@eddieonthecode/nest-core";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      namingStrategy: new CoreNamingStrategy(),
      // ... other config
    }),
  ],
})
export class AppModule {}
```

Features:

- Converts table and column names to snake_case
- Custom join table naming: `first_table_to_second_table`
- Custom join column naming: `relation_name_referenced_column`

## Audit Subscribers

The AuditSubscriber automatically populates audit fields (`createdBy`, `updatedBy`, `deletedBy`) for all entities extending BaseEntity:

```typescript
import { Module } from "@nestjs/common";
import { AuditSubscriber } from "@eddieonthecode/nest-core";

@Module({
  providers: [AuditSubscriber],
})
export class AppModule {}
```

The subscriber automatically:

- Sets `createdBy` on entity creation
- Sets `updatedBy` on entity updates
- Sets `deletedBy` on soft deletes
- Uses the current user ID from the RequestContext

## Complete Setup Example

Here's a complete example showing how to set up a NestJS application with all components:

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import {
  TransformResponseInterceptor,
  RequestContextInterceptor,
  AllExceptionsFilter,
  RolesGuard,
} from "@eddieonthecode/nest-core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global interceptors and filters
  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new TransformResponseInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new RolesGuard());

  await app.listen(3000);
}
```

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EntityStoreModule,
  LoggingModule,
  AuditSubscriber,
  CoreNamingStrategy,
} from "@eddieonthecode/nest-core";
import { User, Post } from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      namingStrategy: new CoreNamingStrategy(),
      entities: [User, Post],
    }),
    EntityStoreModule.forRoot([User, Post]),
    LoggingModule.forRoot(),
  ],
  providers: [AuditSubscriber],
})
export class AppModule {}
```

```typescript
// user.entity.ts
import { Entity, Column } from "typeorm";
import { BaseEntity } from "@eddieonthecode/nest-core";

@Entity("users")
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  role: string;
}
```

```typescript
// user.controller.ts
import { Controller } from "@nestjs/common";
import {
  SearchRoute,
  GetByIdRoute,
  CreateRoute,
  UpdateRoute,
  DeleteByIdRoute,
  IdParam,
} from "@eddieonthecode/nest-core";
import { UserService } from "./user.service";
import { PaginationRequest } from "@eddieonthecode/nest-core";

@Controller("users")
export class UserController {
  constructor(private userService: UserService) {}

  @SearchRoute()
  searchUsers(@Body() req: PaginationRequest<User>) {
    return this.userService.search(req);
  }

  @GetByIdRoute()
  getUser(@IdParam() id: string) {
    return this.userService.findById(id);
  }

  @CreateRoute()
  createUser(@Body() userData: Partial<User>) {
    return this.userService.create(userData);
  }

  @UpdateRoute()
  updateUser(@IdParam() id: string, @Body() userData: Partial<User>) {
    return this.userService.update(id, userData);
  }

  @DeleteByIdRoute()
  deleteUser(@IdParam() id: string) {
    return this.userService.delete(id);
  }
}
```

```typescript
// user.service.ts
import { Injectable } from "@nestjs/common";
import {
  InjectEntityStore,
  EntityStore,
  PaginationRequest,
} from "@eddieonthecode/nest-core";
import { User } from "./user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectEntityStore(User)
    private userStore: EntityStore<User>,
  ) {}

  async search(req: PaginationRequest<User>) {
    return await this.userStore.search(req);
  }

  async findById(id: string) {
    return await this.userStore.findById(id);
  }

  async create(userData: Partial<User>) {
    const user = this.userStore.createModel(userData);
    return await this.userStore.getRepository().save(user);
  }

  async update(id: string, userData: Partial<User>) {
    return await this.userStore.updateById(id, userData);
  }

  async delete(id: string) {
    return await this.userStore.deleteById(id);
  }
}
```

## Configuration

Make sure you have the required peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm rxjs typeorm
```

## Contributing

This package is designed to accelerate NestJS development. Feel free to submit issues and feature requests.

## License

MIT
