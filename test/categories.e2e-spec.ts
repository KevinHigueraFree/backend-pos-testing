import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { CategoriesModule } from '../src/categories/categories.module';
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { DataSource } from 'typeorm';
import { UpdateCategoryDto } from 'src/categories/dto/update-category.dto';
import { testInvalidIdE2E } from './helpers/e2e-test.helper';
import { CategoryTestHelper } from './helpers/category-test.helper';
import { ResponseTestHelper } from './helpers/response-test.helper';

describe('CategoriesController (e2e) - Integration Tests', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let testHelper: CategoryTestHelper;

  // BEFORE ALL TESTS: Configure test database
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Import categories module
        CategoriesModule,
        // Configure TypeORM for tests (using SQLite in memory)
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:', // Database in memory (deleted when finished)
          entities: [Category, Product], // Include all related entities
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
    testHelper = new CategoryTestHelper(dataSource);
  });

  // AFTER EACH TEST: Clean the database
  afterEach(async () => {
    // Clean all categories after each test
    await dataSource.getRepository(Category).clear();
  });

  // AFTER ALL TESTS: Close the application
  afterAll(async () => {
    await app.close();
  });

  describe('POST /categories', () => {
    it('Should return 201, when create a category', async () => {
      // Arrange: Prepare the data
      const createCategoryDto = {
        name: 'Electrónica',
      };

      // Act: Make the real HTTP request
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201); // Expect status code 201 (Created)

      // Assert: Verify the response
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createCategoryDto.name);

      // Verify that it was actually saved in the database
      const categoryInDb = await dataSource
        .getRepository(Category)
        .findOne({ where: { id: response.body.id } });

      expect(categoryInDb).toBeDefined();
      expect(categoryInDb?.name).toBe(createCategoryDto.name);
    });

    it('Should return error when name is empty', async () => {
      // Arrange
      const createCategoryDto = {
        name: '',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);

      // Assert
      ResponseTestHelper.expectBadRequest(response, ['The name is required']);
    });

    it('Should return error when name is not string', async () => {
      // Arrange
      const createCategoryDto = {
        name: 20,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);

      // Assert
      ResponseTestHelper.expectBadRequest(response, ['Invalid name']);
    });
  });

  describe('GET /categories', () => {
    it('Shoudl return empty array, when there are not categories', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      // Assert
      expect(response.body).toEqual([]);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Should return 200, when find all categories', async () => {
      // Arrange: Create categories directly in the database
      await testHelper.createCategories(3);

      // Act
      const response = await request(app.getHttpServer()).get('/categories').expect(200);

      // Assert
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /categories/:id', () => {
    it('Should return 200, when category was found', async () => {
      // Arrange: Create a category in the database
      const savedCategory = await testHelper.createCategory({ name: 'Electrónica' });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/categories/${savedCategory.id}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(savedCategory.id);
      expect(response.body.name).toBe('Electrónica');
    });

    it('Shoudl return 404, when categorie was not found', async () => {
      const categoryId = 999;
      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe(`The Category with ID ${categoryId} does not found`);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
    });

    it('Should return 400 when invalid id', async () => {
      // Act & Assert
      await testInvalidIdE2E(app, 'get', '/categories');
    });
  });

  describe('PATCH /categories/:id', () => {
    it('Should return 200 when category was updated succesfully', async () => {
      // Arrange
      const savedCategory = await testHelper.createCategory({ name: 'Electrónica' });
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada',
      };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/categories/${savedCategory.id}`)
        .send(updateCategoryDto)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(savedCategory.id);
      expect(response.body.name).toBe(updateCategoryDto.name);

      // Verify that it was actually updated in the database
      const categoryRepository = dataSource.getRepository(Category);
      const updatedCategoryInDb = await categoryRepository.findOne({
        where: { id: savedCategory.id },
      });
      expect(updatedCategoryInDb).toBeDefined();
      expect(updatedCategoryInDb?.name).toBe(updateCategoryDto.name);
    });

    it('Should return 404 when category to update were not found', async () => {
      // Arrange
      const categoryId = 999;
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada',
      };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .send(updateCategoryDto)
        .expect(404);

      // Assert
      ResponseTestHelper.expectNotFound(
        response,
        `The Category with ID ${categoryId} does not found`
      );
    });

    it('Should return 400 when invalid id', async () => {
      // Arrange
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada',
      };

      // Act & Assert
      await testInvalidIdE2E(app, 'patch', '/categories', 'invalid-id', updateCategoryDto);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('Should return 200 when category was removed successfully', async () => {
      // Arrange
      const savedCategory = await testHelper.createCategory({ name: 'Electrónica' });

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/categories/${savedCategory.id}`)
        .expect(200);

      // Assert
      // NestJS may return strings as plain text, we check response.text
      const expectedMessage = `The Category with ID ${savedCategory.id} was removed`;
      // When NestJS returns a string, it may be in response.text instead of response.body
      expect(response.text || response.body).toBe(expectedMessage);

      // Verify that it was actually deleted from the database
      const categoryRepository = dataSource.getRepository(Category);
      const removedCategoryInDb = await categoryRepository.findOne({
        where: { id: savedCategory.id },
      });
      expect(removedCategoryInDb).toBeNull();
    });

    it('Should return 404 when category to delete was not found', async () => {
      // Arrange
      const categoryId = 999;

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(404);

      // Assert
      ResponseTestHelper.expectNotFound(
        response,
        `The Category with ID ${categoryId} does not found`
      );
    });

    it('Should return 400 when invalid id', async () => {
      // Act & Assert
      await testInvalidIdE2E(app, 'delete', '/categories');
    });
  });
});
