import {
  Get,
  HttpCode,
  HttpStatus,
  Post,
  applyDecorators,
} from '@nestjs/common';

export function SearchRoute() {
  return applyDecorators(Post('search'), HttpCode(HttpStatus.OK));
}

export function GetByIdRoute() {
  return applyDecorators(Get(':id'));
}

export function SearchTreeRoute() {
  return applyDecorators(Post('search-tree'));
}

export function RecycleBinRoute() {
  return applyDecorators(Post('recycle-bin'), HttpCode(HttpStatus.OK));
}
