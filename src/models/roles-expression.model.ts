/**
 * RolesExpression defines authorization rules using only 3 logical operators:
 * - Array<string>          : leaf that means "user must have ANY of these roles".
 * - { and: RolesExpr[] }   : all child expressions must evaluate to true.
 * - { or: RolesExpr[] }    : at least one child expression must evaluate to true.
 * - { not: RolesExpr[] }   : negates a child expression; with multiple items, negates the OR of them.
 *
 * Examples:
 *  - ['admin', 'manager']                 // user must be admin OR manager
 *  - { and: [ ['admin'], ['auditor'] ] }  // user must be admin AND auditor
 *  - { or: [ ['admin'], ['manager'] ] }   // user must be admin OR manager
 *  - { not: [ ['banned'] ] }              // user must NOT have role 'banned'
 *  - {
 *      or: [
 *        ['admin'],
 *        { and: [ ['manager'], { not: [ ['suspended'] ] } ] }
 *      ]
 *    }
 */
export type RolesExpression =
  | string[]
  | {
      and?: RolesExpression[];
      or?: RolesExpression[];
      not?: RolesExpression[];
    };