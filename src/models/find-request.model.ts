import { Type } from "class-transformer";
import { IsArray, IsObject, IsOptional, ValidateNested } from "class-validator";
import { FindSearch } from "./find-search.model";
import { FindSort } from "./find-sort.model";
import { ObjectFilter } from "./object-filter.model";

/**
 * Request model for find operations with search, filter, and sort capabilities.
 * Combines text search, complex filtering, and sorting in a single request.
 *
 * @example
 * ```typescript
 * // Search users with multiple criteria
 * const findRequest = {
 *   search: {
 *     keyword: 'john',
 *     fields: ['name', 'email'],
 *     useAccent: true
 *   },
 *   filter: {
 *     status: { eq: 'active' },
 *     age: { gt: 18, lt: 65 }
 *   },
 *   sort: [
 *     { field: 'createdAt', order: 'DESC' },
 *     { field: 'name', order: 'ASC' }
 *   ]
 * };
 *
 * // Simple filter only
 * const findRequest = {
 *   filter: { role: { eq: 'admin' } }
 * };
 * ```
 */
export class FindRequest<T> {
  /**
   * Text search criteria for finding entities.
   * Supports keyword search across multiple fields with accent sensitivity.
   *
   * @example
   * ```typescript
   * search: {
   *   keyword: 'john',
   *   fields: ['name', 'email']
   * }
   * ```
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => FindSearch)
  @IsObject()
  search?: FindSearch;

  /**
   * Complex filtering criteria for entities.
   * Supports nested conditions, comparisons, and logical operators.
   *
   * @example
   * ```typescript
   * filter: {
   *   status: { eq: 'active' },
   *   age: { gt: 18, lt: 65 },
   *   tags: { in: ['admin', 'moderator'] },
   *   and: [
   *     { status: { eq: 'active' } },
   *     { or: [{ role: { eq: 'admin' } }, { role: { eq: 'moderator' } }] }
   *   ]
   * }
   * ```
   */
  @IsOptional()
  filter?: ObjectFilter<T>;

  /**
   * Sorting criteria for results.
   * Supports multiple sort fields with ascending/descending order.
   *
   * @example
   * ```typescript
   * sort: [
   *   { field: 'createdAt', order: 'DESC' },
   *   { field: 'name', order: 'ASC' }
   * ]
   * ```
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FindSort)
  @IsArray()
  sort?: FindSort[];
}
