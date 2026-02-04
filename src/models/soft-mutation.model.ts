/**
 * Status codes for soft delete operations.
 * Indicates the result of soft delete and recovery operations.
 */
export enum SoftMutationStatus {
  /**
   * Entity was not found in the database.
   * Returned when the provided ID doesn't exist.
   */
  NOT_FOUND = "NOT_FOUND",

  /**
   * No operation was needed.
   * Returned when the entity is already in the desired state
   * (e.g., already deleted when trying to soft delete, or already restored when trying to recover).
   */
  NO_OP = "NO_OP",

  /**
   * Operation completed successfully.
   * Returned when the soft delete or recovery was performed.
   */
  SUCCESS = "SUCCESS",
}

/**
 * Result of a single soft mutation operation (soft delete or recover).
 * Provides status information and optionally the affected entity.
 *
 * @example
 * ```typescript
 * // Successful soft delete
 * const result: SoftMutationResult<User> = {
 *   status: SoftMutationStatus.SUCCESS,
 *   entity: userEntity
 * };
 *
 * // Entity not found
 * const result: SoftMutationResult<User> = {
 *   status: SoftMutationStatus.NOT_FOUND
 * };
 *
 * // Already deleted (no operation needed)
 * const result: SoftMutationResult<User> = {
 *   status: SoftMutationStatus.NO_OP,
 *   entity: userEntity
 * };
 * ```
 */
export interface SoftMutationResult<T> {
  /**
   * Status of the soft mutation operation.
   * Indicates whether the operation succeeded, failed, or was unnecessary.
   */
  status: SoftMutationStatus;

  /**
   * The affected entity (if found).
   * Present for SUCCESS and NO_OP statuses, but not for NOT_FOUND.
   */
  entity?: T;
}

/**
 * Result of a bulk soft mutation operation.
 * Provides detailed breakdown of operation results across multiple entities.
 *
 * @example
 * ```typescript
 * // Bulk soft delete result
 * const result: BulkSoftMutationResult<User> = {
 *   total: 5,
 *   success: [user1, user2],      // Successfully soft deleted
 *   noOp: [user3],                // Already deleted
 *   notFound: ['id4', 'id5']      // IDs not found
 * };
 *
 * // Check operation summary
 * console.log(`Processed ${result.total} entities`);
 * console.log(`Successfully deleted: ${result.success.length}`);
 * console.log(`Already deleted: ${result.noOp.length}`);
 * console.log(`Not found: ${result.notFound.length}`);
 * ```
 */
export interface BulkSoftMutationResult<T> {
  /**
   * Total number of entities processed.
   * Equals the number of IDs provided in the request.
   */
  total: number;

  /**
   * Array of entities that were successfully operated on.
   * For soft delete: entities that were successfully soft deleted.
   * For recovery: entities that were successfully recovered.
   */
  success: T[];

  /**
   * Array of entities where no operation was needed.
   * For soft delete: entities that were already deleted.
   * For recovery: entities that were already active.
   */
  noOp: T[];

  /**
   * Array of entity IDs that were not found in the database.
   * These IDs were provided but no corresponding entities exist.
   */
  notFound: string[];
}
