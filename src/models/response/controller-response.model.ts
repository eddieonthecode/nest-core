import { HttpStatus } from "@nestjs/common";

/**
 * Universal cookie options interface.
 * Defines standard cookie configuration options compatible with most web frameworks.
 *
 * @example
 * ```typescript
 * const options: UniversalCookieOptions = {
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'strict',
 *   maxAge: 3600000 // 1 hour
 * };
 * ```
 */
export interface UniversalCookieOptions {
  /** Domain where the cookie is valid */
  domain?: string;
  /** Path where the cookie is valid */
  path?: string;
  /** Cookie expiration time in milliseconds */
  maxAge?: number;
  /** Specific expiration date */
  expires?: Date;
  /** Cookie accessible only via HTTP (not JavaScript) */
  httpOnly?: boolean;
  /** Cookie sent only over HTTPS */
  secure?: boolean;
  /** SameSite cookie policy */
  sameSite?: "strict" | "lax" | "none";
  /** Cookie should be signed */
  signed?: boolean;
}

/**
 * Cookie configuration model.
 * Defines the structure for setting cookies in controller responses.
 *
 * @example
 * ```typescript
 * const cookie: CookieConfig = {
 *   name: 'auth-token',
 *   value: 'jwt-token-here',
 *   options: {
 *     httpOnly: true,
 *     secure: true,
 *     sameSite: 'strict'
 *   }
 * };
 * ```
 */
export interface CookieConfig {
  /** Cookie name */
  name: string;
  /** Cookie value */
  value: string;
  /** Cookie options (security, expiration, etc.) */
  options?: UniversalCookieOptions;
}

/**
 * Enhanced controller response model.
 * Allows controllers to return rich responses with additional features
 * like cookies, redirects, and custom status codes.
 *
 * This class is used with the TransformResponseInterceptor to provide
 * advanced response capabilities beyond simple data returns.
 *
 * @example
 * ```typescript
 * @Get()
 * getUsers(): ControllerResponse<User[]> {
 *   return new ControllerResponse({
 *     data: users,
 *     message: "Users retrieved successfully",
 *     statusCode: HttpStatus.OK,
 *     cookies: [{ name: 'session-id', value: 'abc123' }],
 *     clearCookies: ['old-session'],
 *     redirect: '/dashboard' // Optional redirect
 *   });
 * }
 * ```
 */
export class ControllerResponse<T> {
  /** HTTP status code for the response */
  statusCode?: HttpStatus;
  /** Response message */
  message?: string;
  /** Response payload data */
  data?: T;
  /** Cookies to set in the response */
  cookies?: CookieConfig[];
  /** Names of cookies to clear */
  clearCookies?: string[];
  /** URL to redirect to (optional) */
  redirect?: string;

  /**
   * Creates a new ControllerResponse instance.
   *
   * @param response - Partial response object with desired properties
   */
  constructor(response: ControllerResponse<T>) {
    this.data = undefined;
    Object.assign(this, response);
  }
}
