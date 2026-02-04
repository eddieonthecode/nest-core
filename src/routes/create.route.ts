import { Post, applyDecorators } from '@nestjs/common';

export function CreateRoute() {
  return applyDecorators(Post());
}
