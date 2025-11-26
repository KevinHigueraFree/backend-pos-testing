import { DataSource } from 'typeorm';
import { Category } from '../../src/categories/entities/category.entity';
import { Product } from '../../src/products/entities/product.entity';
import { Coupon } from '../../src/coupons/entities/coupon.entity';
import { Transaction } from '../../src/transactions/entities/transaction.entity';
import { CreateCategoryDto } from '../../src/categories/dto/create-category.dto';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { CreateCouponDto } from '../../src/coupons/dto/create-coupon.dto';
import { CreateTransactionDto } from '../../src/transactions/dto/create-transaction.dto';
import { categoryCreateDtos, productCreateDtos, couponCreateDtos } from '../../src/common/test-data';
import { addDays } from 'date-fns';

/**
 * Helper para crear datos de prueba comunes en tests de transacciones
 */
export class TransactionTestHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Crea una categoría de prueba
   */
  async createCategory(dto?: CreateCategoryDto): Promise<Category> {
    const categoryRepository = this.dataSource.getRepository(Category);
    const createDto = dto || categoryCreateDtos[0];
    return await categoryRepository.save({ ...createDto });
  }

  /**
   * Crea un producto de prueba asociado a una categoría
   */
  async createProduct(category: Category, dto?: CreateProductDto, overrides?: Partial<Product>): Promise<Product> {
    const productRepository = this.dataSource.getRepository(Product);
    const createDto = dto || productCreateDtos[0];
    return await productRepository.save({ ...createDto, category, ...overrides });
  }

  /**
   * Crea múltiples productos de prueba
   */
  async createProducts(category: Category, count: number = 2): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const dto = productCreateDtos[i] || productCreateDtos[0];
      products.push(await this.createProduct(category, dto));
    }
    return products;
  }

  /**
   * Crea un cupón de prueba con fecha futura por defecto
   */
  async createCoupon(dto?: CreateCouponDto, daysFromNow: number = 1): Promise<Coupon> {
    const couponRepository = this.dataSource.getRepository(Coupon);
    const createDto = dto || couponCreateDtos[0];
    return await couponRepository.save({
      ...createDto,
      expirationDate: addDays(new Date(), daysFromNow) as any
    });
  }

  /**
   * Crea una transacción de prueba directamente en la BD (sin pasar por el servicio)
   */
  async createTransactionDirectly(dto: CreateTransactionDto): Promise<Transaction> {
    const transactionRepository = this.dataSource.getRepository(Transaction);
    return await transactionRepository.save({ ...dto });
  }

  /**
   * Crea un setup completo: categoría + productos + cupón
   */
  async createFullSetup(options?: {
    categoryDto?: CreateCategoryDto;
    productCount?: number;
    withCoupon?: boolean;
    couponDaysFromNow?: number;
  }): Promise<{
    category: Category;
    products: Product[];
    coupon?: Coupon;
  }> {
    const category = await this.createCategory(options?.categoryDto);
    const productCount = options?.productCount || 2;
    const products = await this.createProducts(category, productCount);

    let coupon: Coupon | undefined;
    if (options?.withCoupon !== false) {
      coupon = await this.createCoupon(undefined, options?.couponDaysFromNow);
    }

    return { category, products, coupon };
  }

  /**
   * Crea un DTO de transacción con productos dados
   */
  createTransactionDto(
    products: Product[],
    options?: {
      total?: number;
      coupon?: string;
      quantities?: number[];
      prices?: number[];
    }
  ): CreateTransactionDto {
    const contents = products.map((product, index) => ({
      productId: product.id,
      quantity: options?.quantities?.[index] || 1,
      price: options?.prices?.[index] || product.price
    }));

    const total = options?.total || contents.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return {
      total,
      coupon: options?.coupon,
      contents
    } as CreateTransactionDto;
  }
}

