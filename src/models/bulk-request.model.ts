import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkRequest {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
