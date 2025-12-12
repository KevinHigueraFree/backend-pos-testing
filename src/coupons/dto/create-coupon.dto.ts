import { IsDateString, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty({ message: 'The name is required' })
  @IsString({ message: 'Invalid name' })
  name: string;

  @IsNotEmpty({ message: 'The porcentaje is required' })
  @IsInt({ message: 'Invalid percentage' })
  @Max(100, { message: 'The max percentage is 100' })
  @Min(1, { message: 'The min percentage is 1' })
  percentage: number;

  @IsNotEmpty({ message: 'The date is required' })
  @IsDateString({}, { message: 'Invalid date' })
  expirationDate: number;
}
