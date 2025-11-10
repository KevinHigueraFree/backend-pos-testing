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

describe('CategoriesController (e2e) - Tests de Integración', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  // ANTES DE TODOS LOS TESTS: Configurar la base de datos de prueba
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Importar el módulo de categories
        CategoriesModule,
        // Configurar TypeORM para tests (usando SQLite en memoria)
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:', // Base de datos en memoria (se borra al terminar)
          entities: [Category, Product], // Incluir todas las entidades relacionadas
          synchronize: true, // Crear tablas automáticamente
          dropSchema: true, // Borrar esquema antes de cada test
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Agregar ValidationPipe global para que funcione la validación
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
    }));
    await app.init();

    // Obtener la conexión a la base de datos para limpiar datos
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  // DESPUÉS DE CADA TEST: Limpiar la base de datos
  afterEach(async () => {
    // Limpiar todas las categorías después de cada test
    await dataSource.getRepository(Category).clear();
  });

  // DESPUÉS DE TODOS LOS TESTS: Cerrar la aplicación
  afterAll(async () => {
    await app.close();
  });

  describe('POST /categories', () => {
    it('debería crear una nueva categoría en la base de datos', async () => {
      // Arrange: Preparar los datos
      const createCategoryDto = {
        name: 'Electrónica',
      };

      // Act: Hacer la petición HTTP real
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201); // Esperar código 201 (Created)

      // Assert: Verificar la respuesta
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createCategoryDto.name);

      // Verificar que realmente se guardó en la base de datos
      const categoryInDb = await dataSource
        .getRepository(Category)
        .findOne({ where: { id: response.body.id } });

      expect(categoryInDb).toBeDefined();
      expect(categoryInDb?.name).toBe(createCategoryDto.name);
    });

    it('Should return error when name is empty', async () => {
      //Arrange
      const createCategoryDto = {
        name: ''
      };

      //Act
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);

      //Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toStrictEqual(['The name is required']);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('Should return error when name is not string', async () => {
      //Arrange
      const createCategoryDto = {
        name: 20
      };

      //Act
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);

      //Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toStrictEqual(['Invalid name']);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bad Request');
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });

  describe('GET /categories', () => {
    it('debería retornar un array vacío cuando no hay categorías', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      // Assert
      expect(response.body).toEqual([]);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debería retornar todas las categorías creadas', async () => {
      // Arrange: Crear categorías directamente en la BD
      const categoryRepository = dataSource.getRepository(Category);
      await categoryRepository.save({ name: 'Electrónica' });
      await categoryRepository.save({ name: 'Ropa' });
      await categoryRepository.save({ name: 'Hogar' });

      // Act
      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      // Assert
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

  });

  describe('GET /categories/:id', () => {
    it('debería retornar una categoría por su ID', async () => {
      // Arrange: Crear una categoría en la BD
      const categoryRepository = dataSource.getRepository(Category);
      const savedCategory = await categoryRepository.save({ name: 'Electrónica' });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/categories/${savedCategory.id}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(savedCategory.id);
      expect(response.body.name).toBe('Electrónica');
    });

    it('debería retornar 404 cuando la categoría no existe', async () => {
      const categoryId = 999
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
    })
  });

  describe('PATCH /categories/:id', () => {
    it('Should return 200 when category was updated succesfully', async () => {
      //Arrange
      const categoryRepository = dataSource.getRepository(Category);
      const savedCategory = await categoryRepository.save({ name: 'Electrónica' });
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada'
      };

      //Act
      const response = await request(app.getHttpServer())
        .patch(`/categories/${savedCategory.id}`)
        .send(updateCategoryDto)
        .expect(200);

      //Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(savedCategory.id);
      expect(response.body.name).toBe(updateCategoryDto.name);

      // Verificar que realmente se actualizó en la base de datos
      const updatedCategoryInDb = await categoryRepository.findOne({
        where: { id: savedCategory.id }
      });
      expect(updatedCategoryInDb).toBeDefined();
      expect(updatedCategoryInDb?.name).toBe(updateCategoryDto.name);
    });

    it('Should return 404 when category to update were not found', async () => {
      //Arrange
      const categoryId = 999
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada'
      };

      //Act
      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .send(updateCategoryDto)
        .expect(404);

      //Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toStrictEqual(`The Category with ID ${categoryId} does not found`);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
    });

    it('Should return 400 when invalid id', async () => {
      // Arrange
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Electronica actualizada'
      };

      // Act & Assert
      await testInvalidIdE2E(app, 'patch', '/categories', 'invalid-id', updateCategoryDto);
    })
  })

  describe('DELETE /categories/:id', () => {
    it('Should return 200 when category was removed successfully', async () => {
      //Arrange
      const categoryRepository = dataSource.getRepository(Category);
      const savedCategory = await categoryRepository.save({ name: 'Electrónica' });

      //Act
      const response = await request(app.getHttpServer())
        .delete(`/categories/${savedCategory.id}`)
        .expect(200);

      //Assert
      // NestJS puede retornar strings como texto plano, verificamos response.text
      const expectedMessage = `The Category with ID ${savedCategory.id} was removed`;
      // Cuando NestJS retorna un string, puede estar en response.text en lugar de response.body
      expect(response.text || response.body).toBe(expectedMessage);

      // Verificar que realmente se eliminó en la base de datos
      const removedCategoryInDb = await categoryRepository.findOne({
        where: { id: savedCategory.id }
      });
      expect(removedCategoryInDb).toBeNull();
    });

    it('Should return 404 when category to delete was not found', async () => {
      //Arrange
      const categoryId = 999;

      //Act
      const response = await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(404);

      //Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe(`The Category with ID ${categoryId} does not found`);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not Found');
    });

    it('Should return 400 when invalid id', async () => {
      // Act & Assert
      await testInvalidIdE2E(app, 'delete', '/categories');
    })
  });
});

