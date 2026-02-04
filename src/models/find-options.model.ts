import { Exclude } from "class-transformer";
import { EntityManager } from "typeorm";

/**
 * Primitive type for type checking in relations.
 */
type Primitive = string | number | boolean | symbol | null | undefined | bigint;

/**
 * Type guard to check if a type is a relation.
 */
type IsRelation<T> = T extends (...args: any[]) => any
  ? false
  : T extends Primitive | Date
    ? false
    : T extends object
      ? true
      : false;

/**
 * Extracts only relation keys from an object type.
 */
type RelationKeys<T> = {
  [K in keyof T]: IsRelation<T[K]> extends true ? K : never;
}[keyof T];

/**
 * Extracts only non-relation keys from an object type.
 */
export type RelationsOnly<T> = Pick<T, RelationKeys<T>>;

/**
 * Extracts the element type from an array type.
 */
type ElementType<T> = T extends (infer E)[] ? E : T;

/**
 * Options for joining related entities.
 */
export type JoinOptions = {
  /**
   * Type of join: left join (default) or inner join.
   */
  join?: "left" | "inner";

  /**
   * Whether to include soft-deleted entities in the join.
   * Default: false
   */
  withDeleted?: boolean;
};

/**
 * Configuration for nested relations with recursive options.
 */
export type NestedRelations<T> = {
  [K in keyof T]?: JoinOptions & {
    /**
     * Nested relations configuration for recursive loading.
     */
    relations?: NestedRelations<ElementType<T[K]>>;
  };
};

/**
 * Options for customizing find operations.
 * Provides control over relations, soft delete handling, and transaction management.
 *
 * @example
 * ```typescript
 * // Basic find with relations
 * const options = {
 *   relations: ['profile', 'roles']
 * };
 *
 * // Complex nested relations
 * const options = {
 *   relations: {
 *     profile: true,
 *     posts: {
 *       relations: ['comments']
 *     }
 *   }
 * };
 *
 * // Include soft-deleted entities
 * const options = {
 *   withDeleted: true
 * };
 *
 * // Use specific entity manager
 * const options = {
 *   manager: transactionManager
 * };
 * ```
 */
export class FindOptions<T> {
  /**
   * Relations to load with the main entity.
   * Can be a simple array of relation names or complex nested object.
   *
   * @example
   * ```typescript
   * // Simple relations
   * relations: ['profile', 'roles']
   *
   * // Nested relations
   * relations: {
   *   profile: true,
   *   posts: { relations: ['comments'] }
   * }
   * ```
   */
  @Exclude()
  relations?: NestedRelations<RelationsOnly<T>> | RelationKeys<T>[];

  /**
   * Whether to include soft-deleted entities in the query.
   * When true, includes both active and soft-deleted entities.
   * Default: false
   *
   * @example
   * ```typescript
   * // Include deleted entities
   * { withDeleted: true }
   * ```
   */
  @Exclude()
  withDeleted?: boolean;

  /**
   * Whether to only return soft-deleted entities.
   * When true, excludes active entities and only returns deleted ones.
   * Default: false
   *
   * @example
   * ```typescript
   * // Only get deleted entities
   * { onlyDeleted: true }
   * ```
   */
  @Exclude()
  onlyDeleted?: boolean;

  /**
   * Entity manager for transaction operations.
   * When provided, all operations will be executed within the specified transaction.
   *
   * @example
   * ```typescript
   * // Use within transaction
   * await this.userStore.findBy({}, { manager: transactionManager });
   * ```
   */
  @Exclude()
  manager?: EntityManager;
}

/**
 * Extended find options specifically for findById operations.
 * Inherits all options from FindOptions and adds error handling control.
 *
 * @example
 * ```typescript
 * // Find and throw if not found
 * await this.userStore.findById(id, { throwNotFound: true });
 *
 * // Find including deleted entities
 * await this.userStore.findById(id, { withDeleted: true });
 *
 * // Use with specific relations
 * await this.userStore.findById(id, {
 *   relations: ['profile'],
 *   throwNotFound: true
 * });
 * ```
 */
export class FindByIdOptions<T> extends FindOptions<T> {
  /**
   * Whether to throw NotFoundException when entity is not found.
   * When true, throws an exception instead of returning null.
   * Default: false
   *
   * @example
   * ```typescript
   * // Will throw if not found
   * await this.userStore.findById(id, { throwNotFound: true });
   * ```
   */
  throwNotFound?: boolean;
}
