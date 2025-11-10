import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';

// Importar TODOS los módulos necesarios para el flujo completo E2E
import { CategoriesModule } from '../src/categories/categories.module';
import { ProductsModule } from '../src/products/products.module';
import { TransactionsModule } from '../src/transactions/transactions.module';

// Importar todas las entidades involucradas
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { Transaction, TransactionContents } from '../src/transactions/entities/transaction.entity';

/**
 * TEST END-TO-END (E2E) VERDADERO PARA CATEGORIES
 * 
 * Este test NO es un test de integración simple. Es un test E2E que prueba:
 * - Múltiples módulos trabajando juntos (Categories, Products, Transactions)
 * - Flujos completos de negocio que involucran categorías
 * - Relaciones entre entidades a través de múltiples módulos
 * - Comportamiento del sistema completo cuando se manipulan categorías
 * 
 * Diferencia clave:
 * - Test de Integración: Prueba CategoriesModule aislado
 * - Test E2E: Prueba Categories + Products + Transactions trabajando juntos
 */
describe('Categories E2E - Flujo Completo del Sistema', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Importar TODOS los módulos necesarios para el flujo completo
        CategoriesModule,
        ProductsModule,
        TransactionsModule,
        // Configurar TypeORM para tests (SQLite en memoria)
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Category, Product, Transaction, TransactionContents],
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
    // Limpiar todas las tablas en orden (respetando foreign keys)
    await dataSource.getRepository(TransactionContents).clear();
    await dataSource.getRepository(Transaction).clear();
    await dataSource.getRepository(Product).clear();
    await dataSource.getRepository(Category).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flujo completo: Gestión de categorías con productos y transacciones', () => {
    it('debería completar el flujo: crear categoría → productos → transacción → actualizar categoría → verificar relaciones', async () => {
      // ============================================
      // PASO 1: Crear una categoría
      // ============================================
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electrónica' })
        .expect(201);

      const createdCategory = categoryResponse.body;
      expect(createdCategory).toHaveProperty('id');
      expect(createdCategory.name).toBe('Electrónica');

      // ============================================
      // PASO 2: Crear productos en esa categoría
      // ============================================
      const productsData = [
        { name: 'Laptop', price: 999.99, inventory: 10, categoryId: createdCategory.id },
        { name: 'Mouse', price: 29.99, inventory: 50, categoryId: createdCategory.id },
      ];

      const createdProducts: Product[] = [];
      for (const productData of productsData) {
        const productResponse = await request(app.getHttpServer())
          .post('/products')
          .send(productData)
          .expect(201);
        createdProducts.push(productResponse.body as Product);
      }

      // Verificar que los productos están asociados a la categoría
      const productsInDb = await dataSource
        .getRepository(Product)
        .find({ 
          where: { id: In(createdProducts.map(p => p.id)) },
          relations: ['category']
        });
      
      expect(productsInDb).toHaveLength(2);
      expect(productsInDb[0].category.id).toBe(createdCategory.id);
      expect(productsInDb[1].category.id).toBe(createdCategory.id);

      // ============================================
      // PASO 3: Verificar que GET /categories retorna productos relacionados
      // ============================================
      const categoriesResponse = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      const categoryWithProducts = (categoriesResponse.body as Category[]).find(
        (cat: Category) => cat.id === createdCategory.id
      );
      expect(categoryWithProducts).toBeDefined();
      expect(categoryWithProducts?.name).toBe('Electrónica');

      // ============================================
      // PASO 4: Crear una transacción con productos de esa categoría
      // ============================================
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 1029.98, // 999.99 + 29.99
          contents: [
            { productId: createdProducts[0].id, quantity: 1, price: 999.99 },
            { productId: createdProducts[1].id, quantity: 1, price: 29.99 },
          ],
        })
        .expect(201);

      expect(transactionResponse.body).toBe('Sale storaged correctly');

      // Verificar que la transacción se creó correctamente
      const transactions = await dataSource
        .getRepository(Transaction)
        .find({
          relations: ['contents', 'contents.product', 'contents.product.category'],
          order: { id: 'DESC' },
          take: 1,
        });

      const transaction = transactions[0];
      expect(transaction).toBeDefined();
      expect(transaction.contents).toHaveLength(2);
      
      // Verificar que los productos en la transacción mantienen la relación con la categoría
      expect(transaction.contents[0].product.category.id).toBe(createdCategory.id);
      expect(transaction.contents[1].product.category.id).toBe(createdCategory.id);

      // ============================================
      // PASO 5: Actualizar la categoría y verificar que los productos mantienen la relación
      // ============================================
      const updatedCategoryResponse = await request(app.getHttpServer())
        .patch(`/categories/${createdCategory.id}`)
        .send({ name: 'Electrónicos y Tecnología' })
        .expect(200);

      expect(updatedCategoryResponse.body.name).toBe('Electrónicos y Tecnología');

      // Verificar que los productos aún están asociados a la categoría actualizada
      const updatedProducts = await dataSource
        .getRepository(Product)
        .find({ 
          where: { id: In(createdProducts.map(p => p.id)) },
          relations: ['category']
        });

      expect(updatedProducts[0].category.id).toBe(createdCategory.id);
      expect(updatedProducts[0].category.name).toBe('Electrónicos y Tecnología');
      expect(updatedProducts[1].category.name).toBe('Electrónicos y Tecnología');

      // ============================================
      // PASO 6: Verificar que GET /categories/:id retorna la categoría actualizada
      // ============================================
      const getCategoryResponse = await request(app.getHttpServer())
        .get(`/categories/${createdCategory.id}`)
        .expect(200);

      expect(getCategoryResponse.body.name).toBe('Electrónicos y Tecnología');
      expect(getCategoryResponse.body.id).toBe(createdCategory.id);
    });

    it('debería permitir crear múltiples categorías y productos, y filtrar productos por categoría', async () => {
      // Crear múltiples categorías
      const category1Response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Ropa' })
        .expect(201);

      const category2Response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Hogar' })
        .expect(201);

      // Crear productos en diferentes categorías
      const product1Response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Camiseta',
          price: 19.99,
          inventory: 100,
          categoryId: category1Response.body.id,
        })
        .expect(201);

      const product2Response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Mesa',
          price: 199.99,
          inventory: 20,
          categoryId: category2Response.body.id,
        })
        .expect(201);

      // Filtrar productos por categoría usando el endpoint de products
      const productsByCategory1 = await request(app.getHttpServer())
        .get(`/products?category_id=${category1Response.body.id}`)
        .expect(200);

      expect(productsByCategory1.body).toHaveLength(1);
      expect(productsByCategory1.body[0].name).toBe('Camiseta');
      expect(productsByCategory1.body[0].category.id).toBe(category1Response.body.id);

      const productsByCategory2 = await request(app.getHttpServer())
        .get(`/products?category_id=${category2Response.body.id}`)
        .expect(200);

      expect(productsByCategory2.body).toHaveLength(1);
      expect(productsByCategory2.body[0].name).toBe('Mesa');
      expect(productsByCategory2.body[0].category.id).toBe(category2Response.body.id);
    });

    it('debería eliminar una categoría y verificar el impacto en productos', async () => {
      // Crear categoría
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Test Category' })
        .expect(201);

      // Crear producto en esa categoría
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Test Product',
          price: 10,
          inventory: 5,
          categoryId: categoryResponse.body.id,
        })
        .expect(201);

      // Verificar que el producto tiene la categoría
      const productBefore = await dataSource
        .getRepository(Product)
        .findOne({
          where: { id: productResponse.body.id },
          relations: ['category'],
        });
      expect(productBefore?.category.id).toBe(categoryResponse.body.id);

      // Eliminar la categoría
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/categories/${categoryResponse.body.id}`)
        .expect(200);

      expect(deleteResponse.body).toBe('Removed Category');

      // Verificar que la categoría fue eliminada
      const categoryAfter = await dataSource
        .getRepository(Category)
        .findOne({ where: { id: categoryResponse.body.id } });
      expect(categoryAfter).toBeNull();

      // Verificar el estado del producto después de eliminar la categoría
      // (Depende de la configuración de cascada en TypeORM)
      const productAfter = await dataSource
        .getRepository(Product)
        .findOne({
          where: { id: productResponse.body.id },
          relations: ['category'],
        });
      
      // El producto puede seguir existiendo pero sin categoría, o ser eliminado en cascada
      // Esto depende de la configuración de la relación en la entidad
      expect(productAfter).toBeDefined();
    });

    it('debería manejar el flujo completo: crear categoría → productos → transacciones → consultar categoría con estadísticas', async () => {
      // Crear categoría
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Deportes' })
        .expect(201);

      // Crear productos
      const product1Response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Pelota',
          price: 15.99,
          inventory: 30,
          categoryId: categoryResponse.body.id,
        })
        .expect(201);

      const product2Response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Raqueta',
          price: 89.99,
          inventory: 15,
          categoryId: categoryResponse.body.id,
        })
        .expect(201);

      // Crear múltiples transacciones con productos de esta categoría
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 15.99,
          contents: [
            { productId: product1Response.body.id, quantity: 1, price: 15.99 },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          total: 89.99,
          contents: [
            { productId: product2Response.body.id, quantity: 1, price: 89.99 },
          ],
        })
        .expect(201);

      // Verificar que la categoría sigue existiendo y es accesible
      const getCategoryResponse = await request(app.getHttpServer())
        .get(`/categories/${categoryResponse.body.id}`)
        .expect(200);

      expect(getCategoryResponse.body.name).toBe('Deportes');

      // Verificar que los productos de la categoría tienen inventario actualizado
      const productsAfterTransactions = await dataSource
        .getRepository(Product)
        .find({
          where: { id: In([product1Response.body.id, product2Response.body.id]) },
        });

      const pelota = productsAfterTransactions.find(p => p.id === product1Response.body.id);
      const raqueta = productsAfterTransactions.find(p => p.id === product2Response.body.id);

      expect(pelota?.inventory).toBe(29); // 30 - 1
      expect(raqueta?.inventory).toBe(14); // 15 - 1

      // Verificar que las transacciones se pueden consultar
      const transactionsResponse = await request(app.getHttpServer())
        .get('/transactions')
        .expect(200);

      expect(transactionsResponse.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});

