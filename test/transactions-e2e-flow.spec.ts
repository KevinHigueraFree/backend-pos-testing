import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';

// Importar todos los módulos necesarios para el flujo completo
import { CategoriesModule } from '../src/categories/categories.module';
import { ProductsModule } from '../src/products/products.module';
import { CouponsModule } from '../src/coupons/coupons.module';
import { TransactionsModule } from '../src/transactions/transactions.module';

// Importar entidades
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { Coupon } from '../src/coupons/entities/coupon.entity';
import { Transaction, TransactionContents } from '../src/transactions/entities/transaction.entity';

/**
 * TEST END-TO-END (E2E)
 * 
 * Este test prueba un flujo completo del sistema POS:
 * 1. Crear una categoría
 * 2. Crear productos en esa categoría
 * 3. Crear un cupón de descuento
 * 4. Crear una transacción con productos y cupón
 * 5. Verificar que todo el flujo funciona correctamente
 * 
 * Diferencia con test de integración:
 * - E2E: Prueba múltiples módulos trabajando juntos (flujo completo)
 * - Integración: Prueba un solo módulo con sus dependencias
 */

describe('Flujo Completo POS (E2E)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  // Datos que se usarán en el flujo completo
  let createdCategory: Category;
  let createdProducts: Product[] = [];
  let createdCoupon: Coupon;
  let createdTransaction: Transaction;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Importar TODOS los módulos necesarios para el flujo completo
        CategoriesModule,
        ProductsModule,
        CouponsModule,
        TransactionsModule,
        // Configurar TypeORM para tests (SQLite en memoria)
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Category, Product, Coupon, Transaction, TransactionContents],
          synchronize: true,
          dropSchema: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    // Limpiar todas las tablas después de cada test
    await dataSource.getRepository(TransactionContents).clear();
    await dataSource.getRepository(Transaction).clear();
    await dataSource.getRepository(Product).clear();
    await dataSource.getRepository(Category).clear();
    await dataSource.getRepository(Coupon).clear();
    
    // Resetear variables
    createdCategory = null as any;
    createdProducts = [];
    createdCoupon = null as any;
    createdTransaction = null as any;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flujo completo: Crear venta con productos y cupón', () => {
    it('debería completar todo el flujo: categoría → productos → cupón → transacción', async () => {
      // ============================================
      // PASO 1: Crear una categoría
      // ============================================
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electrónica' })
        .expect(201);

      createdCategory = categoryResponse.body;
      expect(createdCategory).toHaveProperty('id');
      expect(createdCategory.name).toBe('Electrónica');

      // Verificar que se guardó en la BD
      const categoryInDb = await dataSource
        .getRepository(Category)
        .findOne({ where: { id: createdCategory.id } });
      expect(categoryInDb).toBeDefined();

      // ============================================
      // PASO 2: Crear productos en esa categoría
      // ============================================
      const productsData = [
        { name: 'Laptop', price: 999.99, inventory: 10, categoryId: createdCategory.id },
        { name: 'Mouse', price: 29.99, inventory: 50, categoryId: createdCategory.id },
        { name: 'Teclado', price: 79.99, inventory: 30, categoryId: createdCategory.id },
      ];

      for (const productData of productsData) {
        const productResponse = await request(app.getHttpServer())
          .post('/products')
          .send(productData)
          .expect(201);

        createdProducts.push(productResponse.body);
        expect(productResponse.body).toHaveProperty('id');
        expect(productResponse.body.name).toBe(productData.name);
      }

      // Verificar que los productos se guardaron con la categoría correcta
      const productsInDb = await dataSource
        .getRepository(Product)
        .find({ where: { id: In(createdProducts.map(p => p.id)) } });
      expect(productsInDb).toHaveLength(3);

      // ============================================
      // PASO 3: Crear un cupón de descuento
      // ============================================
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1); // 1 mes en el futuro
      // El DTO espera un número (timestamp), pero TypeORM lo convierte a Date
      const expirationTimestamp = futureDate.getTime(); // Timestamp en milisegundos

      const couponResponse = await request(app.getHttpServer())
        .post('/coupons')
        .send({
          name: 'DESCUENTO10',
          percentage: 10,
          expirationDate: expirationTimestamp,
        })
        .expect(201);

      createdCoupon = couponResponse.body;
      expect(createdCoupon).toHaveProperty('id');
      expect(createdCoupon.name).toBe('DESCUENTO10');
      expect(createdCoupon.percentage).toBe(10);

      // ============================================
      // PASO 4: Crear una transacción con productos y cupón
      // ============================================
      // Calcular total: (999.99 * 1) + (29.99 * 2) + (79.99 * 1) = 1139.96
      // Con descuento del 10%: 1139.96 * 0.9 = 1025.964
      const totalBeforeDiscount = 999.99 + (29.99 * 2) + 79.99;
      const expectedDiscount = totalBeforeDiscount * 0.1;
      const expectedTotal = totalBeforeDiscount - expectedDiscount;

      const transactionData = {
        total: expectedTotal,
        coupon: createdCoupon.name,
        contents: [
          { productId: createdProducts[0].id, quantity: 1, price: 999.99 },
          { productId: createdProducts[1].id, quantity: 2, price: 29.99 },
          { productId: createdProducts[2].id, quantity: 1, price: 79.99 },
        ],
      };

      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionData)
        .expect(201);

      // El servicio retorna un string, pero la transacción se guardó en la BD
      expect(transactionResponse.body).toBe('Sale storaged correctly');

      // Obtener la transacción de la BD para verificar
      const transactions = await dataSource
        .getRepository(Transaction)
        .find({
          relations: ['contents', 'contents.product'],
          order: { id: 'DESC' },
          take: 1,
        });
      
      createdTransaction = transactions[0];
      expect(createdTransaction).toBeDefined();
      expect(createdTransaction.total).toBeCloseTo(expectedTotal, 2);
      expect(createdTransaction.coupon).toBe(createdCoupon.name);
      expect(createdTransaction.discount).toBeCloseTo(expectedDiscount, 2);
      expect(createdTransaction.contents).toHaveLength(3);

      // ============================================
      // PASO 5: Verificar que el inventario se actualizó
      // ============================================
      const updatedProducts = await dataSource
        .getRepository(Product)
        .find({ where: { id: In(createdProducts.map(p => p.id)) } });

      // Laptop: 10 - 1 = 9
      const laptop = updatedProducts.find(p => p.id === createdProducts[0].id);
      expect(laptop?.inventory).toBe(9);

      // Mouse: 50 - 2 = 48
      const mouse = updatedProducts.find(p => p.id === createdProducts[1].id);
      expect(mouse?.inventory).toBe(48);

      // Teclado: 30 - 1 = 29
      const keyboard = updatedProducts.find(p => p.id === createdProducts[2].id);
      expect(keyboard?.inventory).toBe(29);

      // ============================================
      // PASO 6: Verificar que la transacción se puede recuperar
      // ============================================
      const getTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${createdTransaction.id}`)
        .expect(200);

      expect(getTransactionResponse.body.id).toBe(createdTransaction.id);
      expect(getTransactionResponse.body.contents).toHaveLength(3);
      expect(getTransactionResponse.body.contents[0].product).toBeDefined();
      expect(getTransactionResponse.body.contents[0].product.name).toBe('Laptop');
    });

    it('debería crear una transacción sin cupón', async () => {
      // Crear categoría
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Ropa' })
        .expect(201);

      // Crear producto
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Camiseta',
          price: 19.99,
          inventory: 100,
          categoryId: categoryResponse.body.id,
        })
        .expect(201);

      // Crear transacción sin cupón
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 19.99,
          contents: [
            { productId: productResponse.body.id, quantity: 1, price: 19.99 },
          ],
        })
        .expect(201);

      expect(transactionResponse.body).toBe('Sale storaged correctly');

      // Verificar en la BD
      const transactions = await dataSource
        .getRepository(Transaction)
        .find({
          relations: ['contents'],
          order: { id: 'DESC' },
          take: 1,
        });
      
      const transaction = transactions[0];
      expect(transaction.coupon).toBeNull();
      expect(transaction.discount).toBe(0);
      expect(transaction.total).toBe(19.99);
    });

    it('debería fallar si intenta crear transacción con producto inexistente', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 100,
          contents: [
            { productId: 99999, quantity: 1, price: 100 },
          ],
        })
        .expect(400); // O el código de error que tu API retorne
    });

    it('debería fallar si intenta crear transacción con inventario insuficiente', async () => {
      // Crear categoría
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Test' })
        .expect(201);

      // Crear producto con inventario limitado
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Producto Limitado',
          price: 10,
          inventory: 5, // Solo 5 disponibles
          categoryId: categoryResponse.body.id,
        })
        .expect(201);

      // Intentar comprar más de lo disponible
      const errorResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 100,
          contents: [
            { productId: productResponse.body.id, quantity: 10, price: 10 }, // Intentar comprar 10
          ],
        })
        .expect(400); // BadRequestException por inventario insuficiente
      
      expect(errorResponse.body.message).toContain('exced the enable quantity');
    });
  });
});

