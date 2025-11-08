import { IsDefined, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProductDto {
    @IsNotEmpty({ message:"The name is required" })
    @IsString({ message: "Invalid name" })
    name: string

    @IsOptional()
    @IsString({ message: "Invalid image" })
    image?: string

    @IsNotEmpty({ message:"The price is required" })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: "Invalid price" })
    price: number

    @IsNotEmpty({ message: "The inventory is required" })
    @IsInt({message: "Invalid inventory"})
    inventory: number
    
    @IsNotEmpty({ message: "The categoryId is required" })
    @IsInt({message: "Invalid categoryId"})
    categoryId: number
}
