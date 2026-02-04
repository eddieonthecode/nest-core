import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { FindRequest } from './find-request.model';

export class PaginationRequest<T> extends FindRequest<T> {
  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: 'Limit must be greater than 0' })
  limit: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: 'Page must be greater than 0' })
  page: number;

  @IsOptional()
  countQueries?: boolean;
}
