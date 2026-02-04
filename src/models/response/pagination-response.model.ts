import { IPaginationMeta } from 'nestjs-typeorm-paginate';

export interface PaginationResponse<T> {
  items: T[];
  meta: IPaginationMeta;
}
