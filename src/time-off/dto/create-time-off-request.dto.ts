import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CreateTimeOffRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsNumber()
  @IsPositive()
  requestedDays: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
