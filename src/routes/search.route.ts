import {
  Get,
  HttpCode,
  HttpStatus,
  Post,
  applyDecorators,
} from "@nestjs/common";

/**
 * Route decorator for search endpoints.
 * Configures the route to accept POST requests at the 'search' path.
 *
 * @example
 * ```typescript
 * @SearchRoute()
 * searchUsers(@Body() searchDto: SearchDto) {
 *   // Handles POST /users/search
 * }
 * ```
 *
 * @returns Decorator that applies POST('search') and HttpCode(HttpStatus.OK)
 */
export function SearchRoute() {
  return applyDecorators(Post("search"), HttpCode(HttpStatus.OK));
}

/**
 * Route decorator for getting a single resource by ID.
 * Configures the route to accept GET requests at the ':id' path.
 *
 * @example
 * ```typescript
 * @GetByIdRoute()
 * getUser(@Param('id') id: string) {
 *   // Handles GET /users/:id
 * }
 * ```
 *
 * @returns Decorator that applies Get(':id')
 */
export function GetByIdRoute() {
  return applyDecorators(Get(":id"));
}

/**
 * Route decorator for searching hierarchical/tree structures.
 * Configures the route to accept POST requests at the 'search-tree' path.
 * Useful for entities with parent-child relationships.
 *
 * @example
 * ```typescript
 * @SearchTreeRoute()
 * searchCategories(@Body() searchDto: SearchDto) {
 *   // Handles POST /categories/search-tree
 * }
 * ```
 *
 * @returns Decorator that applies Post('search-tree')
 */
export function SearchTreeRoute() {
  return applyDecorators(Post("search-tree"));
}

/**
 * Route decorator for accessing deleted/recycled items.
 * Configures the route to accept POST requests at the 'recycle-bin' path.
 * Used with soft-deleted entities to view and restore deleted items.
 *
 * @example
 * ```typescript
 * @RecycleBinRoute()
 * getDeletedUsers(@Body() searchDto: SearchDto) {
 *   // Handles POST /users/recycle-bin
 * }
 * ```
 *
 * @returns Decorator that applies Post('recycle-bin') and HttpCode(HttpStatus.OK)
 */
export function RecycleBinRoute() {
  return applyDecorators(Post("recycle-bin"), HttpCode(HttpStatus.OK));
}
