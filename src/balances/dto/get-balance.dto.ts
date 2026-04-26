import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetBalanceQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  refresh?: boolean;
}
