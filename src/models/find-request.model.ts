import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { FindSearch } from './find-search.model';
import { FindSort } from './find-sort.model';
import { ObjectFilter } from './object-filter.model';

export class FindRequest<T> {
  @IsOptional()
  @ValidateNested()
  @Type(() => FindSearch)
  @IsObject()
  search?: FindSearch;

  @IsOptional()
  filter?: ObjectFilter<T>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FindSort)
  @IsArray()
  sort?: FindSort[];
}
