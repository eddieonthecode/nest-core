import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { RolesExpression } from 'src/models';

@Injectable()
/**
 * RolesGuard evaluates a RolesExpression set via @Roles() on a route or controller.
 *
 * Best practices:
 *  - Always run an authentication guard (e.g., JwtAuthGuard) BEFORE RolesGuard
 *    so req.user.roles is present.
 *  - Keep roles as short lowercase strings ('admin', 'manager', 'user').
 *  - Prefer coarse-grained routes with RolesGuard; for resource-level rules
 *    (ownership, org), add a policy guard or service-layer checks.
 */
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expr =
      this.reflector.getAllAndOverride<RolesExpression>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);

    // No expression -> allow (authorization not required here)
    if (!expr) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = (request.user ?? {}) as { roles?: string[] };

    const allowed = checkPermission(expr, user.roles);

    if (!allowed) {
      // Choose 403 (Forbidden). If you want to hide route existence, you can throw NotFoundException instead.
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

/**
 * Recursively evaluates a RolesExpression against the current user's roles.
 *
 * Semantics:
 *  - Leaf string[] => ANY-of match (empty array means "no requirement" -> allow)
 *  - { and: [...] } => every child must be true
 *  - { or: [...] }  => at least one child must be true
 *  - { not: [...] } => negate the child; if multiple, negate OR of them
 */
export function checkPermission(
  rolesExpression: RolesExpression,
  roles?: string[],
): boolean {
  const userRoles = new Set(roles ?? []);

  const evalExpr = (expr: RolesExpression): boolean => {
    if (!expr) return true; // no requirement => allow

    // Leaf: ANY-of roles
    if (Array.isArray(expr)) {
      if (expr.length === 0) return true; // empty => allow
      return expr.some((r) => userRoles.has(r));
      // If you ever need ALL-of semantics, express it as { and: [ ['a'], ['b'] ] }
    }

    // Composite: and / or / not
    const { and, or, not } = expr;

    if (and && and.length) {
      return and.every((sub) => evalExpr(sub));
    }
    if (or && or.length) {
      return or.some((sub) => evalExpr(sub));
    }
    if (not && not.length) {
      // not with one item: negate it; with many: negate OR of them
      if (not.length === 1) return !evalExpr(not[0]);
      return !not.some((sub) => evalExpr(sub));
    }

    // Empty object => allow
    return true;
  };

  return evalExpr(rolesExpression);
}