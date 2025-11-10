import { INestApplication, NotFoundException, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoriesModule } from "src/categories/categories.module";
import { CreateCategoryDto } from "src/categories/dto/create-category.dto";
import { Category } from "src/categories/entities/category.entity";
import { categoryCreateDtos, getCategoryById, productCreateDtos, productUpdateDtos } from "src/common/test-data";
import { CreateProductDto } from "src/products/dto/create-product.dto";
import { Product } from "src/products/entities/product.entity";
import { ProductsModule } from "src/products/products.module";
import request from 'supertest';
import { App } from "supertest/types";
import { DataSource } from "typeorm";
import { testInvalidIdE2E } from "./helpers/e2e-test.helper";
import { UpdateProductDto } from "src/products/dto/update-product.dto";

describe('ProductsController (e2e) - Tests de Integración', () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;

    // ANTES DE TODOS LOS TESTS: Configurar la base de datos de prueba
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                // Importar el módulo de products
                ProductsModule,
                CategoriesModule,
                // Configurar TypeORM para tests (usando SQLite en memoria)
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:', // Base de datos en memoria (se borra al terminar)
                    entities: [Product, Category], // Incluir todas las entidades relacionadas
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
        await dataSource.getRepository(Product).clear();
        await dataSource.getRepository(Category).clear();
    });

    // DESPUÉS DE TODOS LOS TESTS: Cerrar la aplicación
    afterAll(async () => {
        await app.close();
    });

    describe('POST /products', () => {
        it('Should return product created successfully without image', async () => {
            //Arrage
            const createProductDto: CreateProductDto = productCreateDtos[0];
            const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0]
            const productRepository = dataSource.getRepository(Product)
            const categoryRepository = dataSource.getRepository(Category)
            const categorySaved: Category = await categoryRepository.save(createCategoryDto)
            createProductDto.categoryId = categorySaved.id
            createProductDto.image = 'img1.jpg'

            //Act
            const response = await request(app.getHttpServer())
                .post('/products')
                .send(createProductDto)
                .expect(201); // Esperar código 201 (Created)

            const productInDB = await productRepository.findOne({ where: { id: response.body.id } });

            //Assert
            expect(productInDB).toBeDefined()
            expect(productInDB?.name).toBe(createProductDto.name)
            expect(productInDB?.image).toBe(createProductDto.image)
            expect(productInDB?.inventory).toBe(createProductDto.inventory)
            expect(productInDB?.price).toBe(createProductDto.price)
        })
        it('Should return 404 when category does not found', async () => {
            //Arrage
            const categoryId = 999
            const createProductDto: CreateProductDto = productCreateDtos[0];
            createProductDto.categoryId = categoryId
            const expectedErrorMessage = `The Category with ID ${createProductDto.categoryId} does not found`

            //Act
            const response = await request(app.getHttpServer())
                .post('/products')
                .send(createProductDto)
                .expect(404); // Esperar código 201 (Created)

            //Assert
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual([expectedErrorMessage])
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return 400 when createProductDto is unprocesable', async () => {
            //Arrage
            const createProductDto = 'Unprocesable'
            //Act
            const response = await request(app.getHttpServer())
                .post('/products')
                .send(createProductDto)
                .expect(400); // Esperar código 201 (Created)

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toStrictEqual(['Invalid name', 'The name is required', 'Invalid price', 'The price is required', 'Invalid inventory', 'The inventory is required', 'Invalid categoryId', 'The categoryId is required']);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Bad Request');
            expect(Array.isArray(response.body.message)).toBe(true);
        })
    })
    describe('GET /products', () => {
        it('Should return all found products', async () => {
            // Arrange: Crear categorías directamente en la BD
            const categoryRepository = dataSource.getRepository(Category);
            const categorySaved1: Category = await categoryRepository.save({ name: 'Electrónica' });
            const categorySaved2: Category = await categoryRepository.save({ name: 'Electrónica' });
            const productsRepository = dataSource.getRepository(Product);
            await productsRepository.save({ ...productCreateDtos[0], categoryId: categorySaved1.id });
            await productsRepository.save({ ...productCreateDtos[1], categoryId: categorySaved1.id });
            await productsRepository.save({ ...productCreateDtos[0], categoryId: categorySaved2.id });

            // Act
            const response = await request(app.getHttpServer())
                .get('/products')
                .expect(200);

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
            // Arrange: Crear categorías y productos directamente en la BD
            const categoryRepository = dataSource.getRepository(Category);
            const categorySaved1: Category = await categoryRepository.save({ name: 'Electrónica' });
            const categorySaved2: Category = await categoryRepository.save({ name: 'Ropa' });
            const productsRepository = dataSource.getRepository(Product);
            // Guardar productos con la relación de categoría completa
            await productsRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
            await productsRepository.save({ ...productCreateDtos[1], category: categorySaved1 });
            await productsRepository.save({ ...productCreateDtos[0], category: categorySaved2 });

            // Act: Enviar query param category_id
            const response = await request(app.getHttpServer())
                .get('/products')
                .query({ category_id: categorySaved1.id.toString() }) // Los query params deben ser strings
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('total');
            expect(response.body.total).toEqual(2); // Solo 2 productos de categorySaved1
            expect(response.body).toHaveProperty('products');
            expect(response.body.products).toHaveLength(2);
            // Verificar que todos los productos pertenecen a la categoría filtrada
            response.body.products.forEach((product: Product) => {
                expect(product.category.id).toBe(categorySaved1.id);
            });
        });

        it('Should return products with pagination (take and skip)', async () => {
            // Arrange: Crear múltiples productos
            const categoryRepository = dataSource.getRepository(Category);
            const categorySaved: Category = await categoryRepository.save({ name: 'Electrónica' });
            const productsRepository = dataSource.getRepository(Product);
            
            // Crear 5 productos con la relación de categoría completa
            for (let i = 0; i < 5; i++) {
                await productsRepository.save({ ...productCreateDtos[0], category: categorySaved });
            }

            // Act: Paginación - tomar 2 productos, saltar 1
            const response = await request(app.getHttpServer())
                .get('/products')
                .query({ 
                    take: '2',  // Los query params deben ser strings
                    skip: '1'   // Los query params deben ser strings
                })
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('total');
            expect(response.body.total).toEqual(5); // Total de productos en BD
            expect(response.body).toHaveProperty('products');
            expect(response.body.products).toHaveLength(2); // Solo 2 productos retornados
        });

        it('Should return products with category_id, take and skip combined', async () => {
            // Arrange: Crear categorías y productos
            const categoryRepository = dataSource.getRepository(Category);
            const categorySaved1: Category = await categoryRepository.save({ name: 'Electrónica' });
            const categorySaved2: Category = await categoryRepository.save({ name: 'Ropa' });
            const productsRepository = dataSource.getRepository(Product);
            
            // 3 productos en categorySaved1
            await productsRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
            await productsRepository.save({ ...productCreateDtos[1], category: categorySaved1 });
            await productsRepository.save({ ...productCreateDtos[0], category: categorySaved1 });
            // 2 productos en categorySaved2
            await productsRepository.save({ ...productCreateDtos[0], category: categorySaved2 });
            await productsRepository.save({ ...productCreateDtos[1], category: categorySaved2 });

            // Act: Filtrar por categoría y paginar
            const response = await request(app.getHttpServer())
                .get('/products')
                .query({ 
                    category_id: categorySaved1.id.toString(),
                    take: '2',
                    skip: '0'
                })
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('total');
            expect(response.body.total).toEqual(3); // Total de productos en categorySaved1
            expect(response.body).toHaveProperty('products');
            expect(response.body.products).toHaveLength(2); // Solo 2 productos retornados (take=2)
            // Verificar que todos pertenecen a categorySaved1
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
            const response = await request(app.getHttpServer())
                .get('/products')
                .expect(200);

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
            // Arrange: Crear categorías directamente en la BD
            const categoryRepository = dataSource.getRepository(Category);
            const categorySaved: Category = await categoryRepository.save({ name: 'Electrónica' });
            const productsRepository = dataSource.getRepository(Product);
            const productSaved: Product = await productsRepository.save({ ...productCreateDtos[0], categoryId: categorySaved.id });

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
            const productId = 999
            const expectedErrorMessage = `The Product with ID ${productId} does not found`

            // Act
            const response = await request(app.getHttpServer())
                .get(`/products/${productId}`)
                .expect(404);

            //Assert
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual([expectedErrorMessage])
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        });
        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'get', '/products');
        })
    });
    describe('PUT /products:id', () => {
        it('Should return product updated sucessfully', async () => {
            //Arrange
            const createProductDto: CreateProductDto = productCreateDtos[0];
            const updateProductDto: UpdateProductDto = productUpdateDtos[0];
            const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0]
            const productRepository = dataSource.getRepository(Product)
            const categoryRepository = dataSource.getRepository(Category)
            const categorySaved: Category = await categoryRepository.save(createCategoryDto)
            const productSaved: Product = await productRepository.save(createProductDto)
            updateProductDto.categoryId = categorySaved.id
            updateProductDto.image = 'img1.jpg'

            //Act
            const response = await request(app.getHttpServer())
                .put(`/products/${productSaved.id}`)
                .send(updateProductDto)
                .expect(200); // Esperar código 200 (Updatedted)

            const productInDB = await productRepository.findOne({ where: { id: response.body.id } });

            //Assert
            expect(productInDB).toBeDefined()
            expect(productInDB?.name).toBe(updateProductDto.name)
            expect(productInDB?.image).toBe(updateProductDto.image)
            expect(productInDB?.inventory).toBe(updateProductDto.inventory)
            expect(productInDB?.price).toBe(updateProductDto.price)
        })
        it('Should return product 404 when product does not found', async () => {
            //Arrange
            const productId = 999
            const expectedErrorMessage = `The Product with ID ${productId} does not found`
            const updateProductDto: UpdateProductDto = productUpdateDtos[0];
            const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0]
            const productRepository = dataSource.getRepository(Product)
            const categoryRepository = dataSource.getRepository(Category)
            const categorySaved: Category = await categoryRepository.save(createCategoryDto)
            updateProductDto.categoryId = categorySaved.id
            updateProductDto.image = 'img1.jpg'

            //Act
            const response = await request(app.getHttpServer())
                .put(`/products/${productId}`)
                .send(updateProductDto)
                .expect(404); // Esperar código 201 (Updated)

            const productInDB = await productRepository.findOne({ where: { id: productId } });

            //Assert
            expect(productInDB).toBeNull()
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual([expectedErrorMessage])
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return product 404 when category does not found', async () => {
            //Arrange
            const categoryId = 999
            const expectedErrorMessage = `The Category with ID ${categoryId} does not found`
            const createProductDto: CreateProductDto = productCreateDtos[0];
            const updateProductDto: UpdateProductDto = productUpdateDtos[0];
            const productRepository = dataSource.getRepository(Product)
            const categoryRepository = dataSource.getRepository(Category)
            const productSaved: Product = await productRepository.save(createProductDto)
            updateProductDto.categoryId = categoryId
            updateProductDto.image = 'img1.jpg'

            //Act
            const response = await request(app.getHttpServer())
                .put(`/products/${productSaved.id}`)
                .send(updateProductDto)
                .expect(404); // Esperar código 201 (Updated)

            const categoryInDB = await categoryRepository.findOne({ where: { id: categoryId } });

            //Assert
            expect(categoryInDB).toBeNull()
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual([expectedErrorMessage])
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return 400 when invalid updateProductDto', async () => {
            //Arrange 
            const updateProductDto = 'Unprocesable'
            //Act
            const response = await request(app.getHttpServer())
                .post('/products')
                .send(updateProductDto)
                .expect(400); // Esperar código 201 (Created)

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toStrictEqual(['Invalid name', 'The name is required', 'Invalid price', 'The price is required', 'Invalid inventory', 'The inventory is required', 'Invalid categoryId', 'The categoryId is required']);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Bad Request');
            expect(Array.isArray(response.body.message)).toBe(true);
        })
        it('Should return 400 when invalid id', async () => {
            //Arrange 
            const updateProductDto: UpdateProductDto = productUpdateDtos[0];

            // Act & Assert
            await testInvalidIdE2E(app, 'get', '/products', 'invalid-id', updateProductDto);
        })
    })
    describe('DELETE /products:id', () => {
        it('Should return 200 when product was removed successfully', async () => {
            //Arrange
            const productRepository = dataSource.getRepository(Product);
            const createProductDto: CreateProductDto = productCreateDtos[0]
            const savedProduct = await productRepository.save(createProductDto);
            const expectedMessage = `The Product with ID ${savedProduct.id} was removed`;

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/products/${savedProduct.id}`)
                .expect(200);

            //Assert
            // Cuando NestJS retorna un string, puede estar en response.text en lugar de response.body
            expect(response.text || response.body).toBe(expectedMessage);

            // Verificar que realmente se eliminó en la base de datos
            const removedProductInDb = await productRepository.findOne({
                where: { id: savedProduct.id }
            });
            expect(removedProductInDb).toBeNull();
        });

        it('Should return 404 when product to delete was not found', async () => {
            //Arrange
            const productId = 999;

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/products/${productId}`)
                .expect(404);

            //Assert
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toStrictEqual([`The Product with ID ${productId} does not found`]);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Not Found');
        });

        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'delete', '/products');
        })
    })
})