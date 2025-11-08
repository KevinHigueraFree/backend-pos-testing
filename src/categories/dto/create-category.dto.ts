import { IsNotEmpty, IsString } from "class-validator";


export class CreateCategoryDto {
	@IsNotEmpty({ message: "El nombre de la categoria es obligatorio" })
	@IsString({ message: "El nombre de la categoria debe ser string" })
	name: string
}
