import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class FindSearch {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsNotEmpty()
  @IsArray()
  fields: string[];

  @IsOptional()
  @IsBoolean()
  useAccent?: boolean;
}
