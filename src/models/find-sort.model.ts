import { IsIn, IsString } from "class-validator";

/**
 * Sorting criteria for find operations.
 * Supports field-based sorting with ascending/descending order.
 *
 * @example
 * ```typescript
 * // Sort by creation date (newest first)
 * const sort = {
 *   field: 'createdAt',
 *   order: 'desc'
 * };
 *
 * // Sort by name alphabetically
 * const sort = {
 *   field: 'name',
 *   order: 'asc'
 * };
 *
 * // Multiple sort criteria
 * const sort = [
 *   { field: 'createdAt', order: 'desc' },
 *   { field: 'name', order: 'asc' }
 * ];
 * ```
 */
export class FindSort {
  /**
   * Field name to sort by.
   * Should correspond to database column name or entity property.
   *
   * @example
   * ```typescript
   * field: 'createdAt'
   * ```
   */
  @IsString()
  field: string;

  /**
   * Sort direction: ascending or descending.
   * 'asc' for ascending (A-Z, 0-9, oldest-newest)
   * 'desc' for descending (Z-A, 9-0, newest-oldest)
   * Default: 'asc'
   *
   * @example
   * ```typescript
   * order: 'asc'  // A-Z, 0-9, oldest-newest
   * order: 'desc'  // Z-A, 9-0, newest-oldest
   * ```
   */
  @IsIn(["asc", "desc"])
  order: "asc" | "desc";
}
