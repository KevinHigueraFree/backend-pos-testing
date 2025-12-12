import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';

import { CategoriesModule } from '../src/categories/categories.module';
import { ProductsModule } from '../src/products/products.module';
import { CouponsModule } from '../src/coupons/coupons.module';
import { TransactionsModule } from '../src/transactions/transactions.module';

import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { Coupon } from '../src/coupons/entities/coupon.entity';
import { Transaction, TransactionContents } from 'src/transactions/entities/transaction.entity';

/**
 * TEST END-TO-END (E2E)
 *
 * Test to verify success full flow of POS:
 * 1. Create category
 * 2. Create products with that category
 * 3. Create coupon
 * 4. Create transaction with products and coupon
 * 5. Verify success flow
 */

describe('Full flow POS (E2E)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let createdCategory: Category;
  let createdProducts: Product[] = [];
  let createdCoupon: Coupon;
  let createdTransaction: Transaction;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CategoriesModule,
        ProductsModule,
        CouponsModule,
        TransactionsModule,
        // Configure TypeORM to tests (SQLite on memory)
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
    // Clean all tables after each test
    await dataSource.getRepository(TransactionContents).clear();
    await dataSource.getRepository(Transaction).clear();
    await dataSource.getRepository(Product).clear();
    await dataSource.getRepository(Category).clear();
    await dataSource.getRepository(Coupon).clear();

    // Reset variables
    createdCategory = null as any;
    createdProducts = [];
    createdCoupon = null as any;
    createdTransaction = null as any;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full flow: create product and coupon', () => {
    it('Should full flow transaction: category → product → coupon → transaction', async () => {
      // Arrange
      const productsData = [
        {
          name: 'Laptop',
          price: 999.99,
          inventory: 10,
          categoryId: 0,
        },
        {
          name: 'Mouse',
          price: 29.99,
          inventory: 50,
          categoryId: 0,
        },
        {
          name: 'Teclado',
          price: 79.99,
          inventory: 30,
          categoryId: 0,
        },
      ];
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1); // 1 month more
      const expirationTimestamp = futureDate.getTime(); // Timestamp in milliseconds
      const totalBeforeDiscount = 999.99 + 29.99 * 2 + 79.99;
      const expectedDiscount = totalBeforeDiscount * 0.1;
      const expectedTotal = totalBeforeDiscount - expectedDiscount;

      // Act - Create category
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electrónica' })
        .expect(201);
      createdCategory = categoryResponse.body;

      // Act - Create products with category
      productsData.forEach((data) => (data.categoryId = createdCategory.id));
      for (const productData of productsData) {
        const productResponse = await request(app.getHttpServer())
          .post('/products')
          .send(productData)
          .expect(201);
        createdProducts.push(productResponse.body);
      }

      // Act - Create coupon
      const couponResponse = await request(app.getHttpServer())
        .post('/coupons')
        .send({
          name: 'DESCUENTO10',
          percentage: 10,
          expirationDate: expirationTimestamp,
        })
        .expect(201);
      createdCoupon = couponResponse.body;

      // Act - Create transaction with products and coupon
      const transactionData = {
        total: expectedTotal,
        coupon: createdCoupon.name,
        contents: [
          {
            productId: createdProducts[0].id,
            quantity: 1,
            price: 999.99,
          },
          {
            productId: createdProducts[1].id,
            quantity: 2,
            price: 29.99,
          },
          {
            productId: createdProducts[2].id,
            quantity: 1,
            price: 79.99,
          },
        ],
      };
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionData)
        .expect(201);

      // Assert
      expect(transactionResponse.text || transactionResponse.body).toBe('Sale storaged correctly');
      expect(createdCategory).toHaveProperty('id');
      expect(createdCategory.name).toBe('Electrónica');

      // Verify category was saved successfully
      const categoryInDb = await dataSource.getRepository(Category).findOne({
        where: {
          id: createdCategory.id,
        },
      });
      expect(categoryInDb).toBeDefined();

      // Verify the products saved with correct category
      const productsInDb = await dataSource.getRepository(Product).find({
        where: {
          id: In(createdProducts.map((p) => p.id)),
        },
      });
      expect(productsInDb).toHaveLength(3);
      createdProducts.forEach((product) => {
        expect(product).toHaveProperty('id');
      });

      // Verify coupon was created
      expect(createdCoupon).toHaveProperty('id');
      expect(createdCoupon.name).toBe('DESCUENTO10');
      expect(createdCoupon.percentage).toBe(10);

      // Verify transaction was saved successfully
      const transactions = await dataSource.getRepository(Transaction).find({
        relations: ['contents', 'contents.product'],
        order: {
          id: 'DESC',
        },
        take: 1,
      });
      createdTransaction = transactions[0];
      expect(createdTransaction).toBeDefined();
      expect(createdTransaction.total).toBeCloseTo(expectedTotal, 2);
      expect(createdTransaction.coupon).toBe(createdCoupon.name);
      expect(createdTransaction.discount).toBeCloseTo(expectedDiscount, 2);
      expect(createdTransaction.contents).toHaveLength(3);

      // Verify inventory was updated successfully
      const updatedProducts = await dataSource.getRepository(Product).find({
        where: {
          id: In(createdProducts.map((p) => p.id)),
        },
      });
      const laptop = updatedProducts.find((p) => p.id === createdProducts[0].id);
      expect(laptop?.inventory).toBe(9); // 10 - 1 = 9
      const mouse = updatedProducts.find((p) => p.id === createdProducts[1].id);
      expect(mouse?.inventory).toBe(48); // 50 - 2 = 48
      const keyboard = updatedProducts.find((p) => p.id === createdProducts[2].id);
      expect(keyboard?.inventory).toBe(29);
      // 30 - 1 = 29

      // Verify transaction can be retrieved
      const getTransactionResponse = await request(app.getHttpServer())
        .get(`/transactions/${createdTransaction.id}`)
        .expect(200);
      expect(getTransactionResponse.body.id).toBe(createdTransaction.id);
      expect(getTransactionResponse.body.contents).toHaveLength(3);
      expect(getTransactionResponse.body.contents[0].product).toBeDefined();
      expect(getTransactionResponse.body.contents[0].product.name).toBe('Laptop');
    });

    it('Should create transaction without coupon', async () => {
      // Arrange
      const categoryData = {
        name: 'Ropa',
      };
      const productData = {
        name: 'Camiseta',
        price: 19.99,
        inventory: 100,
        categoryId: 0,
      };
      const transactionData = {
        total: 19.99,
        contents: [
          {
            productId: 0,
            quantity: 1,
            price: 19.99,
          },
        ],
      };

      // Act - Create category
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send(categoryData)
        .expect(201);

      // Act - Create product
      productData.categoryId = categoryResponse.body.id;
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201);

      // Act - Create transaction without coupon
      transactionData.contents[0].productId = productResponse.body.id;
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionData)
        .expect(201);

      // Assert
      expect(transactionResponse.text || transactionResponse.body).toBe('Sale storaged correctly');

      // Verify transaction in database
      const transactions = await dataSource.getRepository(Transaction).find({
        relations: ['contents'],
        order: {
          id: 'DESC',
        },
        take: 1,
      });
      const transaction = transactions[0];
      expect(transaction.coupon).toBeNull();
      expect(transaction.discount).toBe(0);
      expect(transaction.total).toBe(19.99);
    });

    it('Should fail trying buy when quantity is more than inventory', async () => {
      // Arrange
      const categoryData = {
        name: 'Test',
      };
      const productData = {
        name: 'Producto Limitado',
        price: 10,
        inventory: 5,
        categoryId: 0,
      };
      const transactionData = {
        total: 100,
        contents: [
          {
            productId: 0,
            quantity: 10,
            price: 10,
          },
        ],
      };

      // Act - Create category
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send(categoryData)
        .expect(201);

      // Act - Create product with limited inventory
      productData.categoryId = categoryResponse.body.id;
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201);

      // Act - Try to buy more quantity than available inventory
      transactionData.contents[0].productId = productResponse.body.id;
      const errorResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send(transactionData)
        .expect(400);

      // Assert
      expect(errorResponse.body.message).toStrictEqual([
        'The product Producto Limitado exced the enable quantity',
      ]);
    });
  });
});
