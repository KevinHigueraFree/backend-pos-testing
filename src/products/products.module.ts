import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), TypeOrmModule.forFeature([Category])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
