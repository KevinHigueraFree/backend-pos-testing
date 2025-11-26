import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CategoriesModule } from "../src/categories/categories.module"
import { CreateCategoryDto } from "../src/categories/dto/create-category.dto"
import { Category } from "../src/categories/entities/category.entity"
import { categoryCreateDtos, couponCreateDtos, productCreateDtos, productUpdateDtos } from "../src/common/test-data"
import { CouponsModule } from "../src/coupons/coupons.module"
import { Coupon } from "../src/coupons/entities/coupon.entity"
import { CreateProductDto } from "../src/products/dto/create-product.dto"
import { Product } from "../src/products/entities/product.entity"
import { ProductsModule } from "../src/products/products.module"
import { CreateTransactionDto } from "../src/transactions/dto/create-transaction.dto"
import { Transaction, TransactionContents } from "../src/transactions/entities/transaction.entity"
import { TransactionsModule } from "../src/transactions/transactions.module"
import { App } from "supertest/types"
import { DataSource } from "typeorm"
import request from 'supertest';
import { CreateCouponDto } from "src/coupons/dto/create-coupon.dto"
import { addDays, subDays, format } from "date-fns"
import { testInvalidIdE2E } from "./helpers/e2e-test.helper"
import { TransactionTestHelper } from "./helpers/transaction-test.helper"
import { ResponseTestHelper } from "./helpers/response-test.helper"


describe('TransactionsController (e2e) - Integrations tests', () => {
    let app: INestApplication<App>
    let dataSource: DataSource
    let testHelper: TransactionTestHelper

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ProductsModule,
                CategoriesModule,
                CouponsModule,
                TransactionsModule,
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Category, Product, Coupon, Transaction, TransactionContents],
                    synchronize: true,
                    dropSchema: true,
                    retryAttempts: 0,
                    retryDelay: 0
                })
            ],
        }).compile();

        app = moduleFixture.createNestApplication()

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true
        }))
        await app.init()

        dataSource = moduleFixture.get<DataSource>(DataSource)
        testHelper = new TransactionTestHelper(dataSource)
    });

    afterEach(async () => {
        // Limpiar en orden respetando foreign keys
        if (dataSource && dataSource.isInitialized) {
            await dataSource.getRepository(TransactionContents).clear()
            await dataSource.getRepository(Transaction).clear()
            await dataSource.getRepository(Product).clear()
            await dataSource.getRepository(Category).clear()
            await dataSource.getRepository(Coupon).clear()
        }
    })

    // DESPUÉS DE TODOS LOS TESTS: Cerrar la aplicación y la conexión a la base de datos
    afterAll(async () => {
        // Cerrar la conexión de TypeORM primero
        if (dataSource && dataSource.isInitialized) {
            try {
                await dataSource.destroy();
            } catch (error) {
                // Ignorar errores al cerrar la conexión
            }
        }
        // Luego cerrar la aplicación NestJS
        if (app) {
            try {
                await app.close();
            } catch (error) {
                // Ignorar errores al cerrar la app
            }
        }
    });

    describe('POST /transactions', () => {
        it('Should return transaction created successfully (sin cupón)', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products } = await testHelper.createFullSetup({ withCoupon: false })
            const [product1, product2] = products

            const initialInventory1 = product1.inventory
            const initialInventory2 = product2.inventory
            const quantity1 = 1
            const quantity2 = 1

            const createTransactionDto = testHelper.createTransactionDto(products, {
                total: 2300,
                quantities: [quantity1, quantity2],
                prices: [1500, 800]
            })

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(201)

            //Assert
            expect(response.text || response.body).toBe("Sale storaged correctly")

            // Verificar que la transacción se guardó en la base de datos
            const allTransactions = await transactionRepository.find({
                relations: { contents: { product: true } },
                order: { id: 'ASC' }
            })
            const savedTransaction = allTransactions[0]

            expect(savedTransaction).toBeDefined()
            expect(Number(savedTransaction.total)).toBe(2300)
            expect(savedTransaction.coupon).toBeNull()
            expect(Number(savedTransaction.discount)).toBe(0)
            expect(savedTransaction.contents).toHaveLength(2)

            // Verificar que los productos tienen el inventario actualizado
            const productRepository = dataSource.getRepository(Product)
            const product1Updated = await productRepository.findOne({ where: { id: product1.id } })
            const product2Updated = await productRepository.findOne({ where: { id: product2.id } })

            expect(product1Updated?.inventory).toBe(initialInventory1 - quantity1)
            expect(product2Updated?.inventory).toBe(initialInventory2 - quantity2)

            // Ordenar los contenidos por ID del producto para tener un orden consistente
            const sortedContents = savedTransaction.contents.sort((a, b) => a.product.id - b.product.id)

            // Verificar los contenidos de la transacción
            const content1 = sortedContents.find(c => c.product.id === product1.id)
            const content2 = sortedContents.find(c => c.product.id === product2.id)

            expect(content1).toBeDefined()
            expect(content1?.quantity).toBe(quantity1)
            expect(Number(content1?.price)).toBe(1500)

            expect(content2).toBeDefined()
            expect(content2?.quantity).toBe(quantity2)
            expect(Number(content2?.price)).toBe(800)
        })
        it('Should return transaction created successfully (con cupón válido)', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products, coupon } = await testHelper.createFullSetup({ withCoupon: true })
            const [product1, product2] = products

            const initialInventory1 = product1.inventory
            const initialInventory2 = product2.inventory

            const createTransactionDto = testHelper.createTransactionDto(products, {
                total: 2300,
                coupon: coupon!.name,
                quantities: [1, 1],
                prices: [1500, 800]
            })

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(201)

            //Assert
            expect(response.text || response.body).toBe("Sale storaged correctly")

            // Verificar que la transacción se guardó en la base de datos
            const allTransactions = await transactionRepository.find({
                relations: { contents: { product: true } },
                order: { id: 'ASC' }
            })
            const savedTransaction = allTransactions[0]
            const discount = (coupon!.percentage * createTransactionDto.total) / 100
            const totalWithDiscount = createTransactionDto.total - discount

            expect(savedTransaction).toBeDefined()
            expect(Number(savedTransaction.total)).toBe(totalWithDiscount)
            expect(savedTransaction.coupon).toBe(coupon!.name)
            expect(Number(savedTransaction.discount)).toBe(discount)
            expect(savedTransaction.contents).toHaveLength(2)

            // Verificar que los productos tienen el inventario actualizado
            const productRepository = dataSource.getRepository(Product)
            const product1Updated = await productRepository.findOne({ where: { id: product1.id } })
            const product2Updated = await productRepository.findOne({ where: { id: product2.id } })

            expect(product1Updated?.inventory).toBe(initialInventory1 - 1)
            expect(product2Updated?.inventory).toBe(initialInventory2 - 1)

            // Ordenar los contenidos por ID del producto para tener un orden consistente
            const sortedContents = savedTransaction.contents.sort((a, b) => a.product.id - b.product.id)

            // Verificar los contenidos de la transacción
            const content1 = sortedContents.find(c => c.product.id === product1.id)
            const content2 = sortedContents.find(c => c.product.id === product2.id)

            expect(content1).toBeDefined()
            expect(content1?.quantity).toBe(1)
            expect(Number(content1?.price)).toBe(1500)

            expect(content2).toBeDefined()
            expect(content2?.quantity).toBe(1)
            expect(Number(content2?.price)).toBe(800)
        })

        it('Should return 400 when createTransactionDto is unprocessable', async () => {
            //Arrange
            const createTransactionDto = 'unprocesable'

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(400)

            //Assert
            ResponseTestHelper.expectBadRequest(response, [
                "Invalid total",
                "The total cant'b be empty",
                "The contents cant'b be empty",
                "contents must be an array"
            ])
        })

        it('Should return 404 when product does not exist', async () => {
            //Arrange
            const coupon = await testHelper.createCoupon()
            const productId = 999

            const createTransactionDto: CreateTransactionDto = {
                total: 2300,
                coupon: coupon.name,
                contents: [
                    {
                        productId: productId,
                        quantity: 1,
                        price: 1500
                    }
                ]
            } as CreateTransactionDto

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(404)

            //Assert
            ResponseTestHelper.expectNotFound(response, [`The Product with ID ${productId} does not found`])
        })
        it('Should return 400 when product inventory is insufficient', async () => {
            //Arrange
            const category = await testHelper.createCategory()
            const product = await testHelper.createProduct(category, undefined, { inventory: 0 })
            const coupon = await testHelper.createCoupon()

            const createTransactionDto: CreateTransactionDto = {
                total: 1500,
                coupon: coupon.name,
                contents: [
                    {
                        productId: product.id,
                        quantity: 10,
                        price: 1500
                    }
                ]
            } as CreateTransactionDto

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(400)

            //Assert
            ResponseTestHelper.expectBadRequest(response, [`The product ${product.name} exced the enable quantity`])
        })
        it('Should return 422 when coupon is expired', async () => {
            //Arrange
            const couponRepository = dataSource.getRepository(Coupon)
            const createCouponDto: CreateCouponDto = couponCreateDtos[0]
            const couponSaved = await couponRepository.save({ ...createCouponDto, expirationDate: subDays(new Date(), 1) as any })

            const createTransactionDto: CreateTransactionDto = {
                total: 2300,
                coupon: couponSaved.name,
                contents: [
                    {
                        productId: 1,
                        quantity: 1,
                        price: 1500
                    },
                    {
                        productId: 2,
                        quantity: 1,
                        price: 800
                    }
                ]
            } as CreateTransactionDto

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(422)

            //Assert
            ResponseTestHelper.expectUnprocessableEntity(response, 'Expired coupon')
        })
        it('Should return 404 when coupon does not exist', async () => {
            //Arrange
            const couponName = 'non-exist'
            const createTransactionDto: CreateTransactionDto = {
                total: 2300,
                coupon: couponName,
                contents: [
                    {
                        productId: 1,
                        quantity: 1,
                        price: 1500
                    },
                    {
                        productId: 2,
                        quantity: 1,
                        price: 800
                    }
                ]
            } as CreateTransactionDto

            //Act
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(404)

            //Assert
            ResponseTestHelper.expectNotFound(response, `The Coupon with name: ${couponName} does not found`)
        })
    })

    describe('GET /transactions', () => {
        it('Should return 200 when found transactions', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products } = await testHelper.createFullSetup({ withCoupon: false })
            const [product1, product2] = products

            const createTransactionDto1 = testHelper.createTransactionDto(products, {
                total: 2300,
                quantities: [1, 1],
                prices: [1500, 800]
            })

            const createTransactionDto2 = testHelper.createTransactionDto([product1], {
                total: 2300,
                quantities: [10],
                prices: [1500]
            })

            await transactionRepository.save({ ...createTransactionDto1 })
            await transactionRepository.save({ ...createTransactionDto2 })

            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions`)
                .expect(200)

            //Assert
            expect(response.body).toBeDefined()
            expect(response.body).toHaveLength(2)
        })

        it('Should return 200 and empty array when no transactions found', async () => {
            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions`)
                .expect(200)

            //Assert
            expect(response.body).toBeDefined()
            expect(response.body).toStrictEqual([])
        })

        it('Should return 200 when filtering by transactionDate', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products } = await testHelper.createFullSetup({ withCoupon: false })
            const [product1, product2] = products

            const createTransactionDto1 = testHelper.createTransactionDto(products, {
                total: 2300,
                quantities: [1, 1],
                prices: [1500, 800]
            })

            const createTransactionDto2 = testHelper.createTransactionDto([product1], {
                total: 2300,
                quantities: [10],
                prices: [1500]
            })

            await transactionRepository.save({ ...createTransactionDto1 })
            await transactionRepository.save({ ...createTransactionDto2 })
            const transactionDate = format(new Date(), 'yyyy-MM-dd')

            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions?transactionDate=${transactionDate}`)
                .expect(200)

            //Assert

            expect(response.body).toBeDefined()
            expect(response.body).toHaveLength(2)
        })

        it('Should return 400 when transactionDate is invalid', async () => {
            //Arrange
            const transactionDate = 'invalid-date'

            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions?transactionDate=${transactionDate}`)
                .expect(400)

            //Assert
            ResponseTestHelper.expectBadRequest(response, "Invalid Date")
        })
    })

    describe('GET /transactions:id', () => {
        it('Should return 200 when found transaction', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products, coupon } = await testHelper.createFullSetup({ withCoupon: true })

            const createTransactionDto = testHelper.createTransactionDto(products, {
                total: 2300,
                coupon: coupon!.name,
                quantities: [1, 1],
                prices: [1500, 800]
            })

            const transactionSaved = await transactionRepository.save(createTransactionDto)

            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions/${transactionSaved.id}`)
                .expect(200)

            //Assert
            expect(response.body).toHaveProperty('id')
            expect(response.body).toHaveProperty('total')
            expect(response.body).toHaveProperty('coupon')
            expect(response.body).toHaveProperty('discount')
            expect(response.body).toHaveProperty('transactionDate')
            expect(response.body).toHaveProperty('contents')
        })

        it('Should return 404 when transaction does not found', async () => {
            //Arrange
            const transactionId = 999

            //Act
            const response = await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .expect(404)
            //Assert
            ResponseTestHelper.expectNotFound(response, `The Transaction with ID ${transactionId} does not found`)
        })

        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'get', '/transactions');
        })
    })

    describe('DELETE /transactions:id', () => {
        it('Should return 200 when transaction was removed successfully', async () => {
            //Arrange
            const transactionRepository = dataSource.getRepository(Transaction)
            const { products, coupon } = await testHelper.createFullSetup({ withCoupon: true })

            const createTransactionDto = testHelper.createTransactionDto(products, {
                total: 2300,
                coupon: coupon!.name,
                quantities: [1, 1],
                prices: [1500, 800]
            })

            const transactionSaved = await transactionRepository.save(createTransactionDto)

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/transactions/${transactionSaved.id}`)
                .expect(200)

            //Assert
            expect(response.body.message).toBe(`The Transaction with ID ${transactionSaved.id} was removed`)
        })
        it('Should return 404 when transaction does not found', async () => {
            //Arrange
            const transactionId = 999

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/transactions/${transactionId}`)
                .expect(404)

            //Assert
            ResponseTestHelper.expectNotFound(response, `The Transaction with ID ${transactionId} does not found`)

        })
        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'delete', '/transactions');
        })
    })

})