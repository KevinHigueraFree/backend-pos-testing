import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyCouponDto {
  @IsNotEmpty({ message: 'The name is required' })
  @IsString({ message: 'Invalid name' })
  name: string;
}
