import { Patch, Post, applyDecorators } from '@nestjs/common';

export function RecoverByIdRoute() {
  return applyDecorators(Patch(':id/recover'));
}

export function BulkRecoverRoute() {
  return applyDecorators(Post('recover'));
}
