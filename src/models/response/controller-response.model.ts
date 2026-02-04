import { HttpStatus } from "@nestjs/common";

export interface UniversalCookieOptions {
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  signed?: boolean;
}

/**
 * Cookie configuration model.
 */
export interface CookieConfig {
  name: string;
  value: string;
  options?: UniversalCookieOptions;
}

/**
 * Controller response model.
 */
export class ControllerResponse<T> {
  constructor(response: ControllerResponse<T>) {
    this.data = undefined;
    Object.assign(this, response);
  }

  statusCode?: HttpStatus;
  message?: string;
  data?: T;
  cookies?: CookieConfig[];
  clearCookies?: string[];
  redirect?: string;
}
