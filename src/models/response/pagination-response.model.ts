import { IPaginationMeta } from "nestjs-typeorm-paginate";

/**
 * Standard response format for paginated operations.
 * Contains the paginated items along with metadata about the pagination state.
 *
 * @example
 * ```typescript
 * // Typical pagination response
 * const response: PaginationResponse<User> = {
 *   items: [user1, user2, user3],
 *   meta: {
 *     currentPage: 1,
 *     itemCount: 3,
 *     itemsPerPage: 10,
 *     totalItems: 25,
 *     totalPages: 3
 *   }
 * };
 *
 * // Empty page response
 * const emptyResponse: PaginationResponse<User> = {
 *   items: [],
 *   meta: {
 *     currentPage: 5,
 *     itemCount: 0,
 *     itemsPerPage: 10,
 *     totalItems: 42,
 *     totalPages: 5
 *   }
 * };
 * ```
 */
export interface PaginationResponse<T> {
  /**
   * Array of items for the current page.
   * Contains the actual data entities requested.
   * May be empty if no items match the criteria or if the page is out of range.
   *
   * @example
   * ```typescript
   * items: [user1, user2, user3]
   * items: []  // No results found
   * ```
   */
  items: T[];

  /**
   * Pagination metadata containing navigation information.
   * Includes current page, total counts, and navigation details.
   *
   * @example
   * ```typescript
   * meta: {
   *   currentPage: 1,        // Current page number (1-indexed)
   *   itemCount: 3,          // Number of items on current page
   *   itemsPerPage: 10,      // Items per page limit
   *   totalItems: 25,        // Total items across all pages
   *   totalPages: 3          // Total number of pages
   * }
   * ```
   */
  meta: IPaginationMeta;
}
