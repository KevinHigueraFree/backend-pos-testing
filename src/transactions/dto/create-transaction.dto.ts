import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, ValidateNested } from "class-validator";

export class TransactionContentsDto {
    @IsNotEmpty({ message: "The productId cant'b be empty" })
    @IsInt({ message: 'Invalid productId' })
    productId: number

    @IsNotEmpty({ message: "The quantity cant'b be empty" })
    @IsInt({ message: 'Invalid quantity' })
    quantity: number

    @IsNotEmpty({ message: "The price cant'b be empty" })
    @IsNumber({}, { message: 'Invalid price' })
    price: number
}

export class CreateTransactionDto {
    @IsNotEmpty({ message: "The total cant'b be empty" })
    @IsNumber({}, { message: 'Invalid total' })
    total: number

    @IsOptional()
    coupon: string


    @IsArray()
    @ArrayNotEmpty({ message: "The contents cant'b be empty" })
    @ValidateNested()
    @Type(() => TransactionContentsDto)
    contents: TransactionContentsDto[]
}