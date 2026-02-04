/**
 * Available operators for single value comparisons.
 * Used for filtering entities based on field values.
 */
export type SingleValueOperator =
  | "eq" // Equal to
  | "neq" // Not equal to
  | "gt" // Greater than
  | "gte" // Greater than or equal to
  | "lt" // Less than
  | "lte" // Less than or equal to
  | "contains" // Contains substring (case-insensitive)
  | "notContains" // Does not contain substring
  | "startsWith" // Starts with substring
  | "endsWith"; // Ends with substring

/**
 * Available operators for list/array comparisons.
 * Used for filtering entities against multiple possible values.
 */
export type ListOperator = "in" | "notIn";

/**
 * Filter type for single value operations on a specific field.
 * Maps each operator to the corresponding value to compare against.
 *
 * @example
 * ```typescript
 * // Find users with age greater than 18
 * const filter: SingleValueFilter<User, 'age'> = {
 *   gt: 18
 * };
 *
 * // Find users with name containing 'john'
 * const filter: SingleValueFilter<User, 'name'> = {
 *   contains: 'john'
 * };
 * ```
 */
type SingleValueFilter<T, K extends keyof T> = {
  [O in SingleValueOperator]?: T[K];
};

/**
 * Filter type for list/array operations on a specific field.
 * Maps each operator to an array of values to compare against.
 *
 * @example
 * ```typescript
 * // Find users with role in ['admin', 'moderator']
 * const filter: ListValueFilter<User, 'role'> = {
 *   in: ['admin', 'moderator']
 * };
 *
 * // Find users with status not in ['deleted', 'banned']
 * const filter: ListValueFilter<User, 'status'> = {
 *   notIn: ['deleted', 'banned']
 * };
 * ```
 */
type ListValueFilter<T, K extends keyof T> = {
  [O in ListOperator]?: T[K][];
};

/**
 * Combined filter type for a specific field.
 * Supports both single value and list value operations.
 *
 * @example
 * ```typescript
 * // Filter by age range
 * const ageFilter: FieldFilter<User, 'age'> = {
 *   gte: 18,
 *   lte: 65
 * };
 *
 * // Filter by role list
 * const roleFilter: FieldFilter<User, 'role'> = {
 *   in: ['admin', 'moderator']
 * };
 * ```
 */
export type FieldFilter<T, K extends keyof T> =
  | SingleValueFilter<T, K>
  | ListValueFilter<T, K>;

/**
 * Comprehensive filter object for entity queries.
 * Supports field-based filtering with logical operators (AND/OR).
 * Enables complex nested filtering conditions.
 *
 * @example
 * ```typescript
 * // Simple field filtering
 * const filter: ObjectFilter<User> = {
 *   status: { eq: 'active' },
 *   age: { gt: 18, lt: 65 }
 * };
 *
 * // List filtering
 * const filter: ObjectFilter<User> = {
 *   role: { in: ['admin', 'moderator'] },
 *   status: { notIn: ['deleted', 'banned'] }
 * };
 *
 * // Text filtering
 * const filter: ObjectFilter<User> = {
 *   name: { contains: 'john' },
 *   email: { startsWith: 'user@' }
 * };
 *
 * // Complex logical filtering
 * const filter: ObjectFilter<User> = {
 *   and: [
 *     { status: { eq: 'active' } },
 *     { or: [
 *       { role: { eq: 'admin' } },
 *       { role: { eq: 'moderator' } }
 *     ]}
 *   ],
 *   age: { gte: 18 }
 * };
 *
 * // Nested field filtering
 * const filter: ObjectFilter<User> = {
 *   'profile.department': { eq: 'engineering' },
 *   'posts.title': { contains: 'typescript' }
 * };
 * ```
 */
export type ObjectFilter<T> = {
  [K in keyof T]?: FieldFilter<T, K>;
} & {
  /**
   * Logical AND operator - all conditions must be true.
   * Combines multiple filter objects with AND logic.
   *
   * @example
   * ```typescript
   * and: [
   *   { status: { eq: 'active' } },
   *   { age: { gt: 18 } }
   * ]
   * ```
   */
  and?: ObjectFilter<T>[];

  /**
   * Logical OR operator - at least one condition must be true.
   * Combines multiple filter objects with OR logic.
   *
   * @example
   * ```typescript
   * or: [
   *   { role: { eq: 'admin' } },
   *   { role: { eq: 'moderator' } }
   * ]
   * ```
   */
  or?: ObjectFilter<T>[];
};
