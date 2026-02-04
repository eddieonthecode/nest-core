/**
 * EntityStoreModule
 *
 * A NestJS module that provides a convenient repository pattern implementation
 * for TypeORM entities with automatic soft-delete detection.
 *
 * Features:
 * - Automatic EntityStore/EntityStoreSoftDelete provider creation
 * - Support for multiple data sources
 * - Type-safe dependency injection
 * - Global module registration
 *
 * @example Basic usage with default data source
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { TypeOrmModule } from '@nestjs/typeorm';
 * import { EntityStoreModule } from './entity-store.module';
 * import { User, Product } from './entities';
 *
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({
 *       type: 'postgres',
 *       entities: [User, Product],
 *     }),
 *     EntityStoreModule.forRoot([User, Product]),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Multiple data sources
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { TypeOrmModule } from '@nestjs/typeorm';
 * import { EntityStoreModule } from './entity-store.module';
 * import { User, Product, Analytics } from './entities';
 *
 * @Module({
 *   imports: [
 *     // Primary database
 *     TypeOrmModule.forRoot({
 *       name: 'default',
 *       type: 'postgres',
 *       entities: [User, Product],
 *     }),
 *     // Analytics database
 *     TypeOrmModule.forRoot({
 *       name: 'analytics',
 *       type: 'postgres',
 *       entities: [Analytics],
 *     }),
 *     // Register entity stores for default data source
 *     EntityStoreModule.forRoot([User, Product]),
 *     // Register entity stores for analytics data source
 *     EntityStoreModule.forRoot([Analytics], 'analytics'),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Using in a service
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { InjectEntityStore } from './entity-store.module';
 * import { EntityStore } from './entity-store';
 * import { User, Analytics } from './entities';
 *
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     // Inject from default data source
 *     @InjectEntityStore(User)
 *     private userStore: EntityStore<User>,
 *
 *     // Inject from analytics data source
 *     @InjectEntityStore(Analytics, 'analytics')
 *     private analyticsStore: EntityStore<Analytics>,
 *   ) {}
 *
 *   async findAll() {
 *     return this.userStore.find();
 *   }
 * }
 * ```
 */

import {
  DynamicModule,
  Global,
  Inject,
  Module,
  Provider,
  Type,
} from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { BaseEntity } from "./base.entity";
import { EntityStore, EntityStoreSoftDelete } from "./entity-store";

/**
 * Generates a unique token for an EntityStore provider.
 * The token is based on the entity name and the data source name.
 *
 * @param entity - The entity class
 * @param dataSourceName - The name of the data source (default: 'default')
 * @returns A unique string token
 *
 * @internal
 */
function getEntityStoreToken(
  entity: Type<unknown>,
  dataSourceName: string,
): string {
  return `EntityStore_${entity.name}_${dataSourceName}`;
}

/**
 * Parameter decorator for injecting an EntityStore into a class constructor.
 *
 * @param entity - The entity class to inject a store for
 * @param dataSourceName - The name of the data source (default: 'default')
 * @returns A parameter decorator
 *
 * @example Default data source
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectEntityStore(User)
 *     private userStore: EntityStore<User>,
 *   ) {}
 * }
 * ```
 *
 * @example Named data source
 * ```typescript
 * @Injectable()
 * export class AnalyticsService {
 *   constructor(
 *     @InjectEntityStore(Analytics, 'analytics')
 *     private analyticsStore: EntityStore<Analytics>,
 *   ) {}
 * }
 * ```
 */
export function InjectEntityStore(
  entity: Type<unknown>,
  dataSourceName = "default",
): ParameterDecorator {
  return Inject(getEntityStoreToken(entity, dataSourceName));
}

/**
 * Validates that an entity class extends the BaseEntity from this package.
 * This ensures entities use the correct BaseEntity implementation with
 * required features for EntityStore functionality.
 *
 * @param entity - The entity class to validate
 * @throws Error if entity does not extend the BaseEntity from this package
 *
 * @internal
 */
function validateEntityInheritance(entity: Type<unknown>): void {
  // Check if entity's prototype chain includes our BaseEntity
  let currentProto = Object.getPrototypeOf(entity);
  let extendsBaseEntity = false;

  while (currentProto && currentProto !== Object.prototype) {
    // Use strict reference check to ensure it's our BaseEntity, not TypeORM's or another
    if (currentProto === BaseEntity) {
      extendsBaseEntity = true;
      break;
    }
    currentProto = Object.getPrototypeOf(currentProto);
  }

  if (!extendsBaseEntity) {
    throw new Error(
      `Entity "${entity.name}" must extend BaseEntity from this package (entity-store module). ` +
        `Found entity extending: ${Object.getPrototypeOf(entity).name || "unknown"}. ` +
        `Please ensure your entity imports and extends the correct BaseEntity: ` +
        `"import { BaseEntity } from './base.entity'"`,
    );
  }
}

/**
 * Creates NestJS providers for EntityStore instances.
 * Automatically detects if an entity has soft-delete capability (deletedAt column)
 * and provides the appropriate store implementation.
 *
 * @param entities - Array of entity classes to create stores for
 * @param dataSourceName - The name of the data source
 * @returns Array of NestJS providers
 * @throws Error if any entity does not extend BaseEntity
 *
 * @internal
 */
function createEntityStoreProviders(
  entities: Type<unknown>[],
  dataSourceName: string,
): Provider[] {
  // Validate all entities extend BaseEntity before creating providers
  entities.forEach(validateEntityInheritance);

  // Get the TypeORM data source token for dependency injection
  const dataSourceToken = getDataSourceToken(dataSourceName);

  return entities.map((entity) => ({
    provide: getEntityStoreToken(entity, dataSourceName),
    useFactory: (dataSource: DataSource) => {
      // Get all registered entity names in the data source
      const registeredEntityNames = dataSource.entityMetadatas.map(
        (meta) => meta.name,
      );

      // If entity is not registered in this data source, return undefined
      if (!registeredEntityNames.includes(entity.name)) {
        console.warn(
          `Entity "${entity.name}" is not registered in data source "${dataSourceName}". ` +
            `EntityStore will not be available.`,
        );
        return undefined;
      }

      // Check if entity has soft-delete capability (deletedAt column)
      const metadata = dataSource.getMetadata(entity);
      const hasSoftDelete = metadata.columns.some(
        (col) => col.propertyName === "deletedAt",
      );

      // Return appropriate store implementation
      return hasSoftDelete
        ? new EntityStoreSoftDelete(dataSource, entity)
        : new EntityStore(dataSource, entity);
    },
    inject: [dataSourceToken],
  }));
}

/**
 * A global NestJS module that provides EntityStore instances for TypeORM entities.
 *
 * This module:
 * - Automatically creates EntityStore or EntityStoreSoftDelete based on entity metadata
 * - Supports multiple data sources
 * - Provides global access to entity stores
 * - Handles entities not registered in a specific data source gracefully
 * - Validates that all entities extend the correct BaseEntity from this package
 */
@Global()
@Module({})
export class EntityStoreModule {
  /**
   * Registers EntityStore providers for the specified entities and data source.
   *
   * @param entities - Array of entity classes to create stores for
   * @param dataSourceName - The name of the TypeORM data source (default: 'default')
   * @returns A dynamic module with EntityStore providers
   *
   * @example Single data source (default)
   * ```typescript
   * EntityStoreModule.forRoot([User, Product])
   * ```
   *
   * @example Named data source
   * ```typescript
   * EntityStoreModule.forRoot([Analytics, Metrics], 'analytics')
   * ```
   *
   * @example Multiple data sources in app module
   * ```typescript
   * @Module({
   *   imports: [
   *     TypeOrmModule.forRoot({
   *       name: 'default',
   *       type: 'postgres',
   *       entities: [User, Product],
   *     }),
   *     TypeOrmModule.forRoot({
   *       name: 'analytics',
   *       type: 'postgres',
   *       entities: [Analytics],
   *     }),
   *     // Register stores for default data source
   *     EntityStoreModule.forRoot([User, Product]),
   *     // Register stores for analytics data source
   *     EntityStoreModule.forRoot([Analytics], 'analytics'),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(
    entities: Type<BaseEntity>[],
    dataSourceName = "default",
  ): DynamicModule {
    // Create providers for all entities
    const providers = createEntityStoreProviders(entities, dataSourceName);

    return {
      module: EntityStoreModule,
      providers,
      exports: providers,
      global: true,
    };
  }
}
