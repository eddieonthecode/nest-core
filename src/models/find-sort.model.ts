import { IsIn, IsString } from 'class-validator';

export class FindSort {
  @IsString()
  field: string;

  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc';
}
