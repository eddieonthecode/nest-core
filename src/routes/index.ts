import { Param } from '@nestjs/common';

export * from './create.route';
export * from './delete.route';
export * from './recover.route';
export * from './search.route';
export * from './update.route';

export const IdParam = () => Param('id');
