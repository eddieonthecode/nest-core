import { Patch, applyDecorators } from "@nestjs/common";

/**
 * Route decorator for updating existing resources.
 * Configures the route to accept PATCH requests at the ':id' path.
 *
 * @example
 * ```typescript
 * @UpdateRoute()
 * updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
 *   // Handles PATCH /users/:id
 * }
 * ```
 *
 * @returns Decorator that applies Patch(':id')
 */
export function UpdateRoute() {
  return applyDecorators(Patch(":id"));
}
