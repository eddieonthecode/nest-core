import { Patch, applyDecorators } from '@nestjs/common';

export function UpdateRoute() {
  return applyDecorators(Patch(':id'));
}
