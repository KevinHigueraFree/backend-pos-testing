import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator"

export class ApplyCouponDto {
    @IsNotEmpty({ message: "The name is required" })
    @IsString({ message: "Invalid name" })
    name: string
}