import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { SanitizedRequest } from 'src/models';

/* ================== STORE ================== */
/**
 * A small, immutable per-request context.
 * - Keep only safe, minimal data. Avoid large/volatile objects.
 * - You can extend with custom keys (tenantId, locale, etc.).
 */
export interface RequestContextStore {
  /** Correlation id (from headers if provided, otherwise generated) */
  readonly requestId: string;

  /** Client IP (forwarded by proxy if configured) */
  readonly ip?: string;

  /** Authenticated user id (sub/id) if available */
  readonly userId?: string;

  /** Raw user object from auth layer (shape is app-specific) */
  readonly user?: unknown;

  /** Redacted headers (authorization/cookie removed) */
  readonly headers: Record<string, string | string[] | undefined>;

  /** Safe snapshot of request data for general use */
  readonly req?: SanitizedRequest;

  /** Space for extensions (tenantId, locale, etc.) */
  readonly [k: string]: unknown;
}

/* ================== CORE ================== */
const als = new AsyncLocalStorage<RequestContextStore>();

/**
 * Static helper to access the request context anywhere in the same async flow.
 * Usage:
 * ```ts
 *   const id = RequestContext.requestId;
 *   const userId = RequestContext.userId;
 *   const tenant = RequestContext.get('tenantId');
 * ```
 */
export class RequestContext {
  /**
   * Run a function with the provided store as the current request context.
   * Normally used by the interceptor; can be reused for jobs/CLI.
   */
  static run<T>(store: RequestContextStore, fn: () => T): T {
    return als.run(Object.freeze(store), fn);
  }

  /** Readonly store (or undefined if not in an HTTP/job context) */
  static get store(): Readonly<RequestContextStore> | undefined {
    return als.getStore();
  }

  /** Get a typed value by key (e.g., get('tenantId')) */
  static get<K extends keyof RequestContextStore>(
    key: K,
  ): RequestContextStore[K] | undefined {
    return als.getStore()?.[key];
  }

  /** Common convenience getters */
  static get requestId() {
    return this.get('requestId') as string | undefined;
  }
  static get userId() {
    return this.get('userId') as string | undefined;
  }
  static get ip() {
    return this.get('ip') as string | undefined;
  }
  static get user() {
    return this.get('user');
  }

  /** Returns the redacted headers (safe to log) */
  static get headers() {
    return (this.get('headers') ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
  }

  /**
   * Case-insensitive header lookup (returns string|string[]|undefined).
   * Example: RequestContext.header('x-request-id')
   */
  static header(key: string) {
    const h = this.headers;
    const lower = key.toLowerCase();
    for (const k of Object.keys(h)) {
      if (k.toLowerCase() === lower) return h[k];
    }
    return undefined;
  }

  /** Sanitized request snapshot (method, url, ip, UA, etc.) */
  static get req(): Readonly<SanitizedRequest> | undefined {
    return this.get('req') as Readonly<SanitizedRequest> | undefined;
  }

  /** Convenience: user agent string if present */
  static get userAgent(): string | undefined {
    const h = this.headers;
    const ua = h['user-agent'] ?? h['User-Agent'];
    return Array.isArray(ua) ? ua[0] : ua;
  }
}

/* ================== HTTP INTERCEPTOR ================== */
/**
 * Registers a RequestContext for each HTTP request.
 * - Bind globally (recommended) or per-controller.
 * - Extracts/propagates correlation id (x-request-id/x-correlation-id/traceparent).
 * - Redacts sensitive headers before storing.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      // Skip for non-HTTP contexts (e.g., GraphQL subscriptions/RPC)
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<any>();
    const user = req.user as any | undefined;

    // Prefer incoming correlation id
    const incomingRequestId =
      req.headers['x-request-id'] ??
      req.headers['x-correlation-id'] ??
      req.headers['traceparent'];
    const requestId =
      (Array.isArray(incomingRequestId)
        ? incomingRequestId[0]
        : incomingRequestId) || randomUUID();

    // Redact sensitive headers before copying
    const headers = { ...req.headers } as Record<
      string,
      string | string[] | undefined
    >;
    for (const secret of ['authorization', 'cookie', 'set-cookie']) {
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === secret) headers[k] = undefined;
      }
    }

    // Minimal, safe snapshot of the request (avoid heavy/volatile fields)
    const sanitizedReq: Readonly<SanitizedRequest> = Object.freeze({
      method: req.method,
      protocol: req.protocol,
      httpVersion: req.httpVersion,
      host: req.headers?.host,
      hostname: req.hostname ?? req.headers?.host,
      path: req.path ?? req.url,
      originalUrl: req.originalUrl ?? req.url,
      url: req.url,
      ip: req.ip,
      ips: Array.isArray(req.ips) ? req.ips : undefined,
      userAgent:
        (Array.isArray(req.headers['user-agent'])
          ? req.headers['user-agent'][0]
          : req.headers['user-agent']) ?? undefined,
      referer:
        (Array.isArray(req.headers['referer'])
          ? req.headers['referer'][0]
          : req.headers['referer']) ??
        (Array.isArray(req.headers['referrer'])
          ? req.headers['referrer'][0]
          : req.headers['referrer']) ??
        undefined,
      acceptLanguage:
        (Array.isArray(req.headers['accept-language'])
          ? req.headers['accept-language'][0]
          : req.headers['accept-language']) ?? undefined,
      headers,
    });

    // Run the rest of the pipeline within the request context
    return RequestContext.run(
      {
        requestId,
        ip: req.ip,
        userId: user?.userId ?? user?.sub ?? user?.id,
        user,
        headers,
        req: sanitizedReq,
      },
      () => next.handle(),
    );
  }
}

/**
 * Runs a function with a minimal system context (for jobs/cron/CLI).
 * Example:
 * ```ts
 *   await withSystemContext(async () => service.runJob());
 * ```
 * You can pass a custom userId if needed.
 */
export function withSystemContext<T>(fn: () => T, userId = 'system'): T {
  return RequestContext.run(
    {
      requestId: `sys-${Date.now()}`,
      userId,
      headers: {},
      req: Object.freeze({ method: 'SYSTEM', path: '', headers: {} }),
    },
    fn,
  );
}