import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
        @IsNotEmpty({ message: "El nombre de la categoria es obligatorio" })
        @IsString({ message: "El nombre de la categoria debe ser string" })
        name: string
}
