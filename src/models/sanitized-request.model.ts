/**
 * Sanitized HTTP request information for logging and audit purposes.
 * Contains essential request metadata while excluding sensitive data like body content.
 *
 * @example
 * ```typescript
 * // Typical sanitized request for logging
 * const request: SanitizedRequest = {
 *   method: 'POST',
 *   protocol: 'https',
 *   httpVersion: '1.1',
 *   host: 'api.example.com',
 *   hostname: 'api.example.com',
 *   path: '/api/users',
 *   originalUrl: '/api/users?page=1&limit=10',
 *   url: '/api/users?page=1&limit=10',
 *   ip: '192.168.1.100',
 *   ips: ['192.168.1.100', '10.0.0.1'],
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
 *   referer: 'https://example.com/dashboard',
 *   acceptLanguage: 'en-US,en;q=0.9',
 *   headers: {
 *     'content-type': 'application/json',
 *     'authorization': 'Bearer [REDACTED]',
 *     'x-forwarded-for': '192.168.1.100'
 *   }
 * };
 * ```
 */
export interface SanitizedRequest {
  /**
   * HTTP method used for the request.
   *
   * @example
   * ```typescript
   * method: 'GET'
   * method: 'POST'
   * method: 'PUT'
   * method: 'DELETE'
   * ```
   */
  method?: string;

  /**
   * Request protocol (http or https).
   *
   * @example
   * ```typescript
   * protocol: 'https'
   * protocol: 'http'
   * ```
   */
  protocol?: string;

  /**
   * HTTP version used in the request.
   *
   * @example
   * ```typescript
   * httpVersion: '1.1'
   * httpVersion: '2.0'
   * ```
   */
  httpVersion?: string;

  /**
   * Full host including port if specified.
   *
   * @example
   * ```typescript
   * host: 'api.example.com:3000'
   * host: 'localhost:8080'
   * ```
   */
  host?: string;

  /**
   * Hostname without port.
   *
   * @example
   * ```typescript
   * hostname: 'api.example.com'
   * hostname: 'localhost'
   * ```
   */
  hostname?: string;

  /**
   * Request path without query parameters.
   *
   * @example
   * ```typescript
   * path: '/api/users'
   * path: '/api/posts/123/comments'
   * ```
   */
  path?: string;

  /**
   * Original request URL including query parameters.
   *
   * @example
   * ```typescript
   * originalUrl: '/api/users?page=1&limit=10&sort=createdAt'
   * ```
   */
  originalUrl?: string;

  /**
   * Request URL (may be same as originalUrl).
   *
   * @example
   * ```typescript
   * url: '/api/users?page=1&limit=10'
   * ```
   */
  url?: string;

  /**
   * Client IP address.
   *
   * @example
   * ```typescript
   * ip: '192.168.1.100'
   * ip: '::1'
   * ```
   */
  ip?: string;

  /**
   * Array of IP addresses from proxy chain.
   * Ordered from client to server.
   *
   * @example
   * ```typescript
   * ips: ['192.168.1.100', '10.0.0.1', '172.16.0.1']
   * ```
   */
  ips?: string[];

  /**
   * User-Agent string from the request.
   * Contains browser and client information.
   *
   * @example
   * ```typescript
   * userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
   * userAgent: 'curl/7.68.0'
   * ```
   */
  userAgent?: string;

  /**
   * Referer header indicating the source page.
   *
   * @example
   * ```typescript
   * referer: 'https://example.com/dashboard'
   * referer: 'https://google.com'
   * ```
   */
  referer?: string;

  /**
   * Accept-Language header from the request.
   * Indicates preferred languages for response.
   *
   * @example
   * ```typescript
   * acceptLanguage: 'en-US,en;q=0.9'
   * acceptLanguage: 'fr-FR,fr;q=0.8,en-US;q=0.5'
   * ```
   */
  acceptLanguage?: string;

  /**
   * Request headers (sanitized).
   * Sensitive headers like passwords or tokens should be redacted.
   *
   * @example
   * ```typescript
   * headers: {
   *   'content-type': 'application/json',
   *   'authorization': 'Bearer [REDACTED]',
   *   'x-forwarded-for': '192.168.1.100',
   *   'cookie': '[REDACTED]'
   * }
   * ```
   */
  headers: Record<string, string | string[] | undefined>;
}
