import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ResponseUtil } from "../models";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let status: HttpStatus;
    let message: string;
    let error: string;
    let details: any;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === "string") {
        message = responseBody;
        error = HttpStatus[status];
      } else if (typeof responseBody === "object" && responseBody !== null) {
        message = (responseBody as any).message || "Http Exception";
        error = (responseBody as any).error || HttpStatus[status];
        details = (responseBody as any).details || (responseBody as any).data;
      } else {
        message = "Http Exception";
        error = HttpStatus[status];
      }
      this.logger.warn(
        `HttpException caught: ${request.method} ${request.url} - Status: ${status}, Message: ${message}`,
        exception,
      );
    }
    // Handle Common Error
    else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal Server Error";
      error = "Internal Server Error";
      details = {
        name: exception.name,
        message: exception.message,
        stack:
          process.env.NODE_ENV === "development" ? exception.stack : undefined, // Only show stack in development
      };
      this.logger.error(
        `Unhandled Error caught: ${request.method} ${request.url} - Message: ${exception.message}`,
        exception.stack,
      );
    }
    // Handle Unknown Error
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "An unexpected error occurred";
      error = "Unknown Error";
      this.logger.error(
        `Unknown exception caught: ${request.method} ${request.url}`,
        exception,
      );
    }

    response
      .status(status)
      .json(ResponseUtil.error(request, status, message, error, details));
  }
}
