import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse, ControllerResponse } from "../models";

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T | ControllerResponse<T>,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<any>();
    const response = ctx.getResponse<any>();

    return next.handle().pipe(
      map((originalResponse) => {
        let statusCode = response.statusCode || HttpStatus.OK;
        let message = "Success";
        let data: any = undefined;

        if (this.isControllerResponse(originalResponse)) {
          // Set cookie
          if (originalResponse.cookies && originalResponse.cookies.length > 0) {
            originalResponse.cookies.forEach((cookie) => {
              response.cookie(cookie.name, cookie.value, cookie.options);
            });
          }

          // Clear cookie
          if (
            originalResponse.clearCookies &&
            originalResponse.clearCookies.length > 0
          ) {
            originalResponse.clearCookies.forEach((cookieName) => {
              response.cookie(cookieName, "", {
                expires: new Date(0),
                path: "/",
              });
            });
          }

          // Handle redirect
          if (originalResponse.redirect) {
            response.redirect(originalResponse.redirect);
            return;
          }

          statusCode = originalResponse.statusCode || statusCode;
          message = originalResponse.message || message;
          data = originalResponse.data;
        } else {
          data = originalResponse;
        }

        response.status(statusCode);

        return {
          statusCode: statusCode,
          message: message,
          data: data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  // Helper to check if the response is a ControllerResponse
  private isControllerResponse<T>(
    response: any,
  ): response is ControllerResponse<T> {
    return (
      typeof response === "object" &&
      response !== null &&
      ("data" in response ||
        "cookies" in response ||
        "clearCookies" in response ||
        "statusCode" in response ||
        "message" in response)
    );
  }
}
