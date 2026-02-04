import { Post, applyDecorators } from "@nestjs/common";

/**
 * Route decorator for creating new resources.
 * Configures the route to accept POST requests at the base path.
 *
 * @example
 * ```typescript
 * @CreateRoute()
 * createUser(@Body() createUserDto: CreateUserDto) {
 *   // Handles POST /users
 * }
 * ```
 *
 * @returns Decorator that applies Post()
 */
export function CreateRoute() {
  return applyDecorators(Post());
}
