import { Param } from "@nestjs/common";

export * from "./create.route";
export * from "./delete.route";
export * from "./recover.route";
export * from "./search.route";
export * from "./update.route";

/**
 * Parameter decorator for extracting the 'id' parameter from the route.
 * Provides a consistent way to handle ID parameters across all controllers.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * getUser(@IdParam() id: string) {
 *   // id will contain the value from the route parameter
 * }
 * ```
 *
 * @returns Parameter decorator that extracts the 'id' parameter
 */
export const IdParam = () => Param("id");
