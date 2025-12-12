import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from '../config/typeorm.config';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig, // para dar acceso a config services, es util cuando la configuracion depende de valores dinamicos
      inject: [ConfigService],
    }), // para que esté disponible para categorias, debe estar antes-
    TypeOrmModule.forFeature([Product, Category]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
