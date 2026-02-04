import { Put, applyDecorators } from '@nestjs/common';

export function SaveRoute() {
  return applyDecorators(Put());
}
