import { SetMetadata } from "@nestjs/common";
import { RolesExpression } from "src/models";

export const ROLES_KEY = "roles_rule";

/**
 * @Roles() attaches a RolesExpression to a route or controller.
 *
 * The expression will be evaluated by RolesGuard against the request context:
 * - req.user.roles: string[]   (set by your auth strategy, e.g., JwtStrategy.validate)
 * - req.params, req.query, req.body (available if you extend the expression semantics later)
 *
 * Usage:
 * ```typescript
 *   @Roles(['admin', 'manager'])                        // admin OR manager
 *   @Roles({ and: [ ['admin'], ['auditor'] ] })         // admin AND auditor
 *   @Roles({ not: [ ['banned'] ] })                     // not banned
 *   @Roles({
 *     or: [
 *       ['admin'],
 *       { and: [ ['manager'], { not: [ ['suspended'] ] } ] },
 *     ],
 *   })
 * ```
 */
export const Roles = (expr: RolesExpression) => SetMetadata(ROLES_KEY, expr);
