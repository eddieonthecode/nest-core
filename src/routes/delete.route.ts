import { Delete, Patch, applyDecorators } from "@nestjs/common";

/**
 * Route decorator for permanently deleting a resource by ID.
 * Configures the route to accept DELETE requests at the ':id' path.
 *
 * @example
 * ```typescript
 * @DeleteByIdRoute()
 * deleteUser(@Param('id') id: string) {
 *   // Handles DELETE /users/:id
 * }
 * ```
 *
 * @returns Decorator that applies Delete(':id')
 */
export function DeleteByIdRoute() {
  return applyDecorators(Delete(":id"));
}

/**
 * Route decorator for bulk deletion of resources.
 * Configures the route to accept DELETE requests at the base path.
 *
 * @example
 * ```typescript
 * @BulkDeleteRoute()
 * bulkDeleteUsers(@Body() ids: string[]) {
 *   // Handles DELETE /users
 * }
 * ```
 *
 * @returns Decorator that applies Delete()
 */
export function BulkDeleteRoute() {
  return applyDecorators(Delete());
}

/**
 * Route decorator for soft deleting a resource by ID.
 * Configures the route to accept PATCH requests at the ':id/soft-delete' path.
 * Marks the entity as deleted without removing it from the database.
 *
 * @example
 * ```typescript
 * @SoftDeleteByIdRoute()
 * softDeleteUser(@Param('id') id: string) {
 *   // Handles PATCH /users/:id/soft-delete
 * }
 * ```
 *
 * @returns Decorator that applies Patch(':id/soft-delete')
 */
export function SoftDeleteByIdRoute() {
  return applyDecorators(Patch(":id/soft-delete"));
}

/**
 * Route decorator for bulk soft deletion of resources.
 * Configures the route to accept PATCH requests at the 'soft-delete' path.
 * Marks multiple entities as deleted without removing them from the database.
 *
 * @example
 * ```typescript
 * @BulkSoftDeleteRoute()
 * bulkSoftDeleteUsers(@Body() ids: string[]) {
 *   // Handles PATCH /users/soft-delete
 * }
 * ```
 *
 * @returns Decorator that applies Patch('soft-delete')
 */
export function BulkSoftDeleteRoute() {
  return applyDecorators(Patch("soft-delete"));
}
