import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from 'src/categories/categories.module';
import { CreateCategoryDto } from 'src/categories/dto/create-category.dto';
import { Category } from 'src/categories/entities/category.entity';
import {
  categoryCreateDtos,
  getCategoryById,
  productCreateDtos,
  productUpdateDtos,
} from 'src/common/test-data';
import { CreateProductDto } from 'src/products/dto/create-product.dto';
import { Product } from 'src/products/entities/product.entity';
import { ProductsModule } from 'src/products/products.module';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { testInvalidIdE2E } from './helpers/e2e-test.helper';
import { UpdateProductDto } from 'src/products/dto/update-product.dto';
import { ProductTestHelper } from './helpers/product-test.helper';
import { ResponseTestHelper } from './helpers/response-test.helper';

describe('ProductsController (e2e) - Integration Tests', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let testHelper: ProductTestHelper;

  // Before: configure database for testing
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Import products module
        ProductsModule,
        CategoriesModule,
        // Configure TypeORM for testing (using SQLite in memory)
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:', // Database in memory (deleted when finished)
          entities: [Product, Category], // Include all related entities
          synchronize: true, // Create tables automatically
          dropSchema: true, // Drop schema before each test
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Add global ValidationPipe for validation to work
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      })
    );
    await app.init();

    // Get database connection to clean data
    dataSource = moduleFixture.get<DataSource>(DataSource);
    testHelper = new ProductTestHelper(dataSource);
  });

  // AFTER EACH TEST: Clean the database
  afterEach(async () => {
    // Clean all categories after each test
    await dataSource.getRepository(Product).clear();
    await dataSource.getRepository(Category).clear();
  });

  // AFTER ALL TESTS: Close the application
  afterAll(async () => {
    await app.close();
  });

  describe('POST /products', () => {
    it('Should return product created successfully with image', async () => {
      // Arrange
      const createProductDto: CreateProductDto = productCreateDtos[0];
      const productRepository = dataSource.getRepository(Product);
      const { category } = await testHelper.createFullSetup();

      createProductDto.categoryId = category.id;
      createProductDto.image = 'img1.jpg';

      // Act
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201); // Expect status code 201 (Created)

      const productInDB = await productRepository.findOne({ where: { id: response.body.id } });

      // Assert
      expect(productInDB).toBeDefined();
      expect(productInDB?.name).toBe(createProductDto.name);
      expect(productInDB?.image).toBe(createProductDto.image);
      expect(productInDB?.inventory).toBe(createProductDto.inventory);
      expect(productInDB?.price).toBe(createProductDto.price);
    });
    it('Should return 404 when category does not found', async () => {
      // Arrange
      const categoryId = 999;
      const createProductDto: CreateProductDto = productCreateDtos[0];
      createProductDto.categoryId = categoryId;
      const expectedErrorMessage = `The Category with ID ${createProductDto.categoryId} does not found`;

      // Act
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(404); // Expect status code 404 (Not Found)

      // Assert
      ResponseTestHelper.expectNotFound(response, [expectedErrorMessage]);
    });
    it('Should return 400 when createProductDto is unprocessable', async () => {
      // Arrange
      const createProductDto = 'Unprocessable';

      // Act
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(400); // Expect status code 400 (Bad Request)

      // Assert
      ResponseTestHelper.expectBadRequest(response, [
        'Invalid name',
        'The name is required',
        'Invalid price',
        'The price is required',
        'Invalid inventory',
        'The inventory is required',
        'Invalid categoryId',
        'The categoryId is required',
      ]);
    });
  });
  describe('GET /products', () => {
    it('Should return all found products', async () => {
      // Arrange: Create categories and products directly in the database
      const category1 = await testHelper.createCategory({ name: 'Electrónica' });
      const category2 = await testHelper.createCategory({ name: 'Electrónica' });
      const productRepository = dataSource.getRepository(Product);
      await productRepository.save({ ...productCreateDtos[0], category: category1 });
      await productRepository.save({ ...productCreateDtos[1], category: category1 });
      await productRepository.save({ ...productCreateDtos[0], category: category2 });

      // Act
      const response = await request(app.getHttpServer()).get('/products').expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(3);
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toHaveLength(3);
      expect(response.body.products[0]).toHaveProperty('id');
      expect(response.body.products[0]).toHaveProperty('name');
      expect(response.body.products[0]).toHaveProperty('image');
      expect(response.body.products[0]).toHaveProperty('price');
      expect(response.body.products[0]).toHaveProperty('inventory');
      expect(response.body.products[0]).toHaveProperty('category');
    });
    it('Should return all found products filtered by category_id', async () => {
      // Arrange: Create categories and products directly in the database
      const categorySaved1 = await testHelper.createCategory({ name: 'Electrónica' });
      const categorySaved2 = await testHelper.createCategory({ name: 'Ropa' });
      const productRepository = dataSource.getRepository(Product);
      // Save products with complete category relationship
      await productRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
      await productRepository.save({ ...productCreateDtos[1], category: categorySaved1 });
      await productRepository.save({ ...productCreateDtos[0], category: categorySaved2 });

      // Act: Send category_id query param
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ category_id: categorySaved1.id.toString() }) // Query params must be strings
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(2); // Only 2 products from categorySaved1
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toHaveLength(2);
      // Verify that all products belong to the filtered category
      response.body.products.forEach((product: Product) => {
        expect(product.category.id).toBe(categorySaved1.id);
      });
    });

    it('Should return products with pagination (take and skip)', async () => {
      // Arrange: Create multiple products
      const categorySaved = await testHelper.createCategory({ name: 'Electrónica' });
      const productRepository = dataSource.getRepository(Product);

      // Create 5 products with complete category relationship
      for (let i = 0; i < 5; i++) {
        await productRepository.save({ ...productCreateDtos[0], category: categorySaved });
      }

      // Act: Pagination - take 2 products, skip 1
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({
          take: '2', // Query params must be strings
          skip: '1', // Query params must be strings
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(5); // Total products in database
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toHaveLength(2); // Only 2 products returned
    });

    it('Should return products with category_id, take and skip combined', async () => {
      // Arrange: Create categories and products
      const categorySaved1 = await testHelper.createCategory({ name: 'Electrónica' });
      const categorySaved2 = await testHelper.createCategory({ name: 'Ropa' });
      const productRepository = dataSource.getRepository(Product);

      // 3 products in categorySaved1
      await productRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
      await productRepository.save({ ...productCreateDtos[1], category: categorySaved1 });
      await productRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
      // 2 products in categorySaved2
      await productRepository.save({ ...productCreateDtos[0], category: categorySaved2 });
      await productRepository.save({ ...productCreateDtos[1], category: categorySaved2 });

      // Act: Filter by category and paginate
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({
          category_id: categorySaved1.id.toString(),
          take: '2',
          skip: '0',
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(3); // Total products in categorySaved1
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toHaveLength(2); // Only 2 products returned (take=2)
      // Verify that all belong to categorySaved1
      response.body.products.forEach((product: Product) => {
        expect(product.category.id).toBe(categorySaved1.id);
      });
    });

    it('Should return empty array when category_id does not exist', async () => {
      // Arrange
      const nonExistentCategoryId = 999;

      // Act
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ category_id: nonExistentCategoryId.toString() })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(0);
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toEqual([]);
    });

    it('Should return empty array of products where are not products saved', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/products').expect(200);

      // Assert
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toEqual(0);
      expect(response.body).toHaveProperty('products');
      expect(response.body.products).toEqual([]);
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });
  describe('GET /products/:id', () => {
    it('Should return found product by id', async () => {
      // Arrange: Create categories directly in the database
      const categoryRepository = dataSource.getRepository(Category);
      const categorySaved: Category = await categoryRepository.save({ name: 'Electrónica' });
      const productRepository = dataSource.getRepository(Product);
      const productSaved: Product = await productRepository.save({
        ...productCreateDtos[0],
        categoryId: categorySaved.id,
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/products/${productSaved.id}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('image');
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('inventory');
      expect(response.body).toHaveProperty('category');
    });

    it('Should return 404 where was not found the product', async () => {
      const productId = 999;
      const expectedErrorMessage = `The Product with ID ${productId} does not found`;

      // Act
      const response = await request(app.getHttpServer()).get(`/products/${productId}`).expect(404);

      //Assert
      ResponseTestHelper.expectNotFound(response, [expectedErrorMessage]);
    });
    it('Should return 400 when invalid id', async () => {
      // Act & Assert
      await testInvalidIdE2E(app, 'get', '/products');
    });
  });
  describe('PUT /products:id', () => {
    it('Should return product updated sucessfully', async () => {
      // Arrange
      const createProductDto: CreateProductDto = productCreateDtos[0];
      const updateProductDto: UpdateProductDto = productUpdateDtos[0];
      const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0];
      const productRepository = dataSource.getRepository(Product);
      const categoryRepository = dataSource.getRepository(Category);
      const categorySaved: Category = await categoryRepository.save(createCategoryDto);
      const productSaved: Product = await productRepository.save(createProductDto);
      updateProductDto.categoryId = categorySaved.id;
      updateProductDto.image = 'img1.jpg';

      // Act
      const response = await request(app.getHttpServer())
        .put(`/products/${productSaved.id}`)
        .send(updateProductDto)
        .expect(200); // Expect status code 200 (OK)

      const productInDB = await productRepository.findOne({ where: { id: response.body.id } });

      // Assert
      expect(productInDB).toBeDefined();
      expect(productInDB?.name).toBe(updateProductDto.name);
      expect(productInDB?.image).toBe(updateProductDto.image);
      expect(productInDB?.inventory).toBe(updateProductDto.inventory);
      expect(productInDB?.price).toBe(updateProductDto.price);
    });
    it('Should return product 404 when product does not found', async () => {
      // Arrange
      const productId = 999;
      const expectedErrorMessage = `The Product with ID ${productId} does not found`;
      const updateProductDto: UpdateProductDto = productUpdateDtos[0];
      const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0];
      const productRepository = dataSource.getRepository(Product);
      const categoryRepository = dataSource.getRepository(Category);
      const categorySaved: Category = await categoryRepository.save(createCategoryDto);
      updateProductDto.categoryId = categorySaved.id;
      updateProductDto.image = 'img1.jpg';

      // Act
      const response = await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(updateProductDto)
        .expect(404); // Expect status code 404 (Not Found)

      const productInDB = await productRepository.findOne({ where: { id: productId } });

      // Assert
      expect(productInDB).toBeNull();
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toStrictEqual([expectedErrorMessage]);
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
    });
    it('Should return product 404 when category does not found', async () => {
      // Arrange
      const categoryId = 999;
      const expectedErrorMessage = `The Category with ID ${categoryId} does not found`;
      const createProductDto: CreateProductDto = productCreateDtos[0];
      const updateProductDto: UpdateProductDto = productUpdateDtos[0];
      const productRepository = dataSource.getRepository(Product);
      const categoryRepository = dataSource.getRepository(Category);
      const productSaved: Product = await productRepository.save(createProductDto);
      updateProductDto.categoryId = categoryId;
      updateProductDto.image = 'img1.jpg';

      // Act
      const response = await request(app.getHttpServer())
        .put(`/products/${productSaved.id}`)
        .send(updateProductDto)
        .expect(404); // Expect status code 404 (Not Found)

      const categoryInDB = await categoryRepository.findOne({ where: { id: categoryId } });

      // Assert
      expect(categoryInDB).toBeNull();
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toStrictEqual([expectedErrorMessage]);
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
    });
    it('Should return 400 when invalid updateProductDto', async () => {
      // Arrange
      const updateProductDto = 'Unprocessable';

      // Act
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(updateProductDto)
        .expect(400); // Expect status code 400 (Bad Request)

      // Assert
      ResponseTestHelper.expectBadRequest(response, [
        'Invalid name',
        'The name is required',
        'Invalid price',
        'The price is required',
        'Invalid inventory',
        'The inventory is required',
        'Invalid categoryId',
        'The categoryId is required',
      ]);
    });
    it('Should return 400 when invalid id', async () => {
      //Arrange
      const updateProductDto: UpdateProductDto = productUpdateDtos[0];

      // Act & Assert
      await testInvalidIdE2E(app, 'get', '/products', 'invalid-id', updateProductDto);
    });
  });
  describe('DELETE /products:id', () => {
    it('Should return 200 when product was removed successfully', async () => {
      // Arrange
      const productRepository = dataSource.getRepository(Product);
      const createProductDto: CreateProductDto = productCreateDtos[0];
      const savedProduct = await productRepository.save(createProductDto);
      const expectedMessage = `The Product with ID ${savedProduct.id} was removed`;

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/products/${savedProduct.id}`)
        .expect(200);

      // Assert
      // When NestJS returns a string, it may be in response.text instead of response.body
      expect(response.text || response.body).toBe(expectedMessage);

      // Verify that it was really removed from the database
      const removedProductInDb = await productRepository.findOne({
        where: { id: savedProduct.id },
      });
      expect(removedProductInDb).toBeNull();
    });

    it('Should return 404 when product to delete was not found', async () => {
      // Arrange
      const productId = 999;

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      ResponseTestHelper.expectNotFound(response, [
        `The Product with ID ${productId} does not found`,
      ]);
    });

    it('Should return 400 when invalid id', async () => {
      // Act & Assert
      await testInvalidIdE2E(app, 'delete', '/products');
    });
  });
});
