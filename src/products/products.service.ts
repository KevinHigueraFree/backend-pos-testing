import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { FindManyOptions, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,// repository realiza variabas funciones pero pasandole un generic, el codigo se adapta
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>// repository realiza variabas funciones pero pasandole un generic, el codigo se adapta
  ) { }

  async create(createProductDto: CreateProductDto) {
    const category = await this.categoryRepository.findOneBy({ id: createProductDto.categoryId })
    if (!category) {
      let errors: string[] = [];
      errors.push(`The category with ID ${createProductDto.categoryId} does not found`);
      throw new NotFoundException(errors);
    }

    return this.productRepository.save({
      ...createProductDto,
      category
    })

  }

  async findAll(categoryId: number | null, take: number, skip: number) {
    const options: FindManyOptions<Product> = {
      relations: {
        category: true
      },
      order: {
        id: 'DESC'
      },
      take,
      skip
    }

    if (categoryId) {
      options.where = {
        category: {
          id: categoryId
        }
      }
    }

    //products y total es para ponerle nombre a los datos a el numero. de los regsitros contados
    const [products, total] = await this.productRepository.findAndCount(options)
    return {total, products }
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: {
        id
      },
      relations: {
        category: true
      }
    });

    if (!product) {
      let errors: string[] = [];
      errors.push(`The product with ID ${id} does not found`);
      throw new NotFoundException(errors);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id)
    Object.assign(product, updateProductDto)

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOneBy({ id: updateProductDto.categoryId })
      if (!category) {
        let errors: string[] = []
        errors.push(`The category with ID ${updateProductDto.categoryId} does not found`);
        throw new NotFoundException(errors);
      }
      product.category = category
    }

    return await this.productRepository.save(product)
  }

  async remove(id: number) {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
    return `The Product with ID ${id} was removed`

  }
}
