import { IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";
import { FindRequest } from "./find-request.model";

/**
 * Request model for paginated search operations.
 * Extends FindRequest with pagination controls (limit, page) and optional query counting.
 *
 * @example
 * ```typescript
 * // Basic pagination
 * const pagination = {
 *   limit: 10,
 *   page: 1
 * };
 *
 * // Pagination with search and filtering
 * const pagination = {
 *   limit: 20,
 *   page: 2,
 *   search: {
 *     keyword: 'john',
 *     fields: ['name', 'email']
 *   },
 *   filter: {
 *     status: { eq: 'active' },
 *     age: { gt: 18 }
 *   },
 *   sort: [
 *     { field: 'createdAt', order: 'DESC' }
 *   ]
 * };
 *
 * // Pagination with query counting disabled
 * const pagination = {
 *   limit: 50,
 *   page: 1,
 *   countQueries: false
 * };
 * ```
 */
export class PaginationRequest<T> extends FindRequest<T> {
  /**
   * Number of items to return per page.
   * Must be greater than 0.
   *
   * @example
   * ```typescript
   * limit: 10  // Return 10 items per page
   * limit: 25  // Return 25 items per page
   * ```
   */
  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: "Limit must be greater than 0" })
  limit: number;

  /**
   * Page number to retrieve.
   * Must be greater than 0. Pages are 1-indexed.
   *
   * @example
   * ```typescript
   * page: 1  // First page
   * page: 5  // Fifth page
   * ```
   */
  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: "Page must be greater than 0" })
  page: number;

  /**
   * Whether to execute count queries for total item count.
   * When false, skips the COUNT query for better performance.
   * Default: true
   *
   * @example
   * ```typescript
   * countQueries: true   // Execute COUNT query (default)
   * countQueries: false  // Skip COUNT query for performance
   * ```
   */
  @IsOptional()
  countQueries?: boolean;
}
