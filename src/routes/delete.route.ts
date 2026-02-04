import { Delete, Patch, applyDecorators } from '@nestjs/common';

export function DeleteByIdRoute() {
  return applyDecorators(Delete(':id'));
}

export function BulkDeleteRoute() {
  return applyDecorators(Delete());
}

export function SoftDeleteByIdRoute() {
  return applyDecorators(Patch(':id/soft-delete'));
}

export function BulkSoftDeleteRoute() {
  return applyDecorators(Patch('soft-delete'));
}
