import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

/**
 * Search criteria for text-based searching across multiple fields.
 * Supports keyword search with optional accent sensitivity.
 *
 * @example
 * ```typescript
 * // Search for users by name or email
 * const search = {
 *   keyword: 'john',
 *   fields: ['name', 'email'],
 *   useAccent: true
 * };
 * ```
 */
export class FindSearch {
  /**
   * Search keyword to look for in specified fields.
   * Supports partial matching and is case-insensitive by default.
   */
  @IsOptional()
  @IsString()
  keyword?: string;

  /**
   * Array of field names to search in.
   * Fields should correspond to database column names.
   */
  @IsNotEmpty()
  @IsArray()
  fields: string[];

  /**
   * Whether to use accent-insensitive search.
   * When true, performs accent-insensitive matching (useful for international content).
   * Default: false
   */
  @IsOptional()
  @IsBoolean()
  useAccent?: boolean;
}
