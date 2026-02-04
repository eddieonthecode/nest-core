import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";

/* ================== STORE ================== */
type RequestContextStore = Record<string, any> & {
  requestId?: string;
  userId?: string;
  email?: string;
  ip?: string;
  timezone?: string;
  userAgent?: string;
  clientOrigin?: string;
};

/* ================== CORE ================== */
const als = new AsyncLocalStorage<RequestContextStore>();

export class RequestContext {
  static run<T>(store: RequestContextStore, fn: () => T): T {
    return als.run(store, fn);
  }

  static get store(): RequestContextStore | undefined {
    return als.getStore();
  }

  static get<K extends keyof RequestContextStore>(
    key: K,
  ): RequestContextStore[K] | undefined {
    return als.getStore()?.[key];
  }

  static get userId() {
    return this.get("userId");
  }

  static get requestId() {
    return this.get("requestId");
  }

  static get timezone() {
    return this.get("timezone");
  }
}

/* ================== HTTP INTERCEPTOR ================== */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as any;

    return RequestContext.run(
      {
        requestId: randomUUID(),
        userId: user?.userId,
        email: user?.email,
        ip: req.ip,
        timezone: req.headers["x-timezone"] as string,
        userAgent: req.headers["user-agent"],
        clientOrigin: req.headers["x-client-origin"] as string,
      },
      () => next.handle(),
    );
  }
}
