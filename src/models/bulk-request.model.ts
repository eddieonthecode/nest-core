import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

/**
 * Request model for bulk operations on multiple entities by their IDs.
 * Used for bulk delete, bulk recover, and other batch operations.
 *
 * @example
 * ```typescript
 * // Bulk delete request
 * const bulkRequest = {
 *   ids: ['id1', 'id2', 'id3']
 * };
 *
 * // Send to bulk delete endpoint
 * await this.userService.bulkDelete(bulkRequest);
 * ```
 */
export class BulkRequest {
  /**
   * Array of entity UUIDs to operate on.
   * Must contain at least one valid UUID string.
   *
   * @example
   * ```typescript
   * ids: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
   * ```
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
