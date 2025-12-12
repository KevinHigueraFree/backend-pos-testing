import { DataSource } from 'typeorm';
import { Category } from '../../src/categories/entities/category.entity';
import { Product } from '../../src/products/entities/product.entity';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { productCreateDtos } from '../../src/common/test-data';
import { CategoryTestHelper } from './category-test.helper';

/**
 * Helper para crear datos de prueba comunes en tests de productos
 */
export class ProductTestHelper {
  private categoryHelper: CategoryTestHelper;

  constructor(private dataSource: DataSource) {
    this.categoryHelper = new CategoryTestHelper(dataSource);
  }

  /**
   * Crea una categoría de prueba
   */
  async createCategory(dto?: any): Promise<Category> {
    return await this.categoryHelper.createCategory(dto);
  }

  /**
   * Crea un producto de prueba asociado a una categoría
   */
  async createProduct(
    category: Category,
    dto?: CreateProductDto,
    overrides?: Partial<Product>
  ): Promise<Product> {
    const productRepository = this.dataSource.getRepository(Product);
    const createDto = dto || productCreateDtos[0];
    return await productRepository.save({ ...createDto, category, ...overrides });
  }

  /**
   * Crea un setup completo: categoría + producto
   */
  async createFullSetup(options?: {
    categoryDto?: any;
    productDto?: CreateProductDto;
    productOverrides?: Partial<Product>;
  }): Promise<{
    category: Category;
    product: Product;
  }> {
    const category = await this.createCategory(options?.categoryDto);
    const product = await this.createProduct(
      category,
      options?.productDto,
      options?.productOverrides
    );
    return { category, product };
  }
}
