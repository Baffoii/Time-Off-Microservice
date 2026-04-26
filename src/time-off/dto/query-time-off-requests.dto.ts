import { IsOptional, IsString } from 'class-validator';

export class QueryTimeOffRequestsDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
