import { Patch, Post, applyDecorators } from "@nestjs/common";

/**
 * Route decorator for recovering a soft-deleted resource by ID.
 * Configures the route to accept PATCH requests at the ':id/recover' path.
 * Restores a previously soft-deleted entity.
 *
 * @example
 * ```typescript
 * @RecoverByIdRoute()
 * recoverUser(@Param('id') id: string) {
 *   // Handles PATCH /users/:id/recover
 * }
 * ```
 *
 * @returns Decorator that applies Patch(':id/recover')
 */
export function RecoverByIdRoute() {
  return applyDecorators(Patch(":id/recover"));
}

/**
 * Route decorator for bulk recovery of soft-deleted resources.
 * Configures the route to accept POST requests at the 'recover' path.
 * Restores multiple previously soft-deleted entities.
 *
 * @example
 * ```typescript
 * @BulkRecoverRoute()
 * bulkRecoverUsers(@Body() ids: string[]) {
 *   // Handles POST /users/recover
 * }
 * ```
 *
 * @returns Decorator that applies Post('recover')
 */
export function BulkRecoverRoute() {
  return applyDecorators(Post("recover"));
}
