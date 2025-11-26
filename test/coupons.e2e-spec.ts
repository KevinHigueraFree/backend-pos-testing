import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { CreateCategoryDto } from "src/categories/dto/create-category.dto"
import { couponCreateDtos, couponUpdateDtos } from "src/common/test-data"
import { CouponsModule } from "src/coupons/coupons.module"
import { CreateCouponDto } from "src/coupons/dto/create-coupon.dto"
import { Coupon } from "src/coupons/entities/coupon.entity"
import request from "supertest"
import { App } from "supertest/types"
import { DataSource } from "typeorm"
import { testInvalidIdE2E } from "./helpers/e2e-test.helper"
import { UpdateCategoryDto } from "src/categories/dto/update-category.dto"
import { UpdateCouponDto } from "src/coupons/dto/update-coupon.dto"
import { addDays, subDays } from "date-fns"
import { ApplyCouponDto } from "src/coupons/dto/apply-coupon"

describe('CouponsController (e2e) - Tests de Integración', () => {
    let app: INestApplication<App>
    let dataSource: DataSource

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CouponsModule
                ,
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Coupon],
                    synchronize: true,
                    dropSchema: true
                })
            ]
        }).compile()

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true
        }))
        await app.init()

        dataSource = moduleFixture.get<DataSource>(DataSource)
    })
    afterEach(async () => {
        // Limpiar todas las categorías después de cada test
        await dataSource.getRepository(Coupon).clear();
    });

    afterAll(async () => {
        await app.close()
    })

    describe('POST /coupons', () => {
        it('Should return coupon created succesfully', async () => {
            //Arrage
            const createCouponDto: CreateCouponDto = couponCreateDtos[0];
            const couponRepository = dataSource.getRepository(Coupon)

            //Act
            const response = await request(app.getHttpServer())
                .post('/coupons')
                .send(createCouponDto)
                .expect(201)

            const couponInDB = await couponRepository.findOne({ where: { id: response.body.id } })

            //Expect
            expect(couponInDB).toBeDefined
            expect(couponInDB?.name).toBe(createCouponDto.name)
            expect(couponInDB?.percentage).toBe(createCouponDto.percentage)
            expect(couponInDB?.expirationDate).toBeInstanceOf(Date)
            expect(couponInDB?.expirationDate.toISOString().split('T')[0]).toBe(createCouponDto.expirationDate)
        })
        it('Should return 400 when createCouponDto is unprocessable', async () => {
            //Arrage
            const createCouponDto = 'Unprocessable'

            //Act
            const response = await request(app.getHttpServer())
                .post('/coupons')
                .send(createCouponDto)
                .expect(400)

            //Assert
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toStrictEqual([
                'Invalid name',
                'The name is required',
                'The min percentage is 1',
                'The max percentage is 100',
                'Invalid percentage',
                'The porcentaje is required',
                'Invalid date',
                'The date is required'
            ]);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Bad Request');
            expect(Array.isArray(response.body.message)).toBe(true);
        })
    })
    describe('GET /coupons', () => {
        it('Should return 200 when found coupons', async () => {
            //Arrage
            const couponRepository = dataSource.getRepository(Coupon)
            await couponRepository.save({ ...couponCreateDtos[0] })
            await couponRepository.save({ ...couponCreateDtos[1] })
            await couponRepository.save({ ...couponCreateDtos[2] })

            //Act
            const response = await request(app.getHttpServer())
                .get('/coupons')
                .expect(200)

            //Assert
            expect(response.body).toHaveLength(3)
            expect(response.body[0]).toHaveProperty('id')
            expect(response.body[0]).toHaveProperty('name')
            expect(response.body[0]).toHaveProperty('percentage')
            expect(response.body[0]).toHaveProperty('expirationDate')
        })
        it('Should return 200 and array empty when does not found coupons', async () => {
            //Act
            const response = await request(app.getHttpServer())
                .get('/coupons')
                .expect(200)

            //Assert
            expect(response.body).toEqual([])
            expect(Array.isArray(response.body)).toBe(true)
        })
    })
    describe('GET/coupons:id', () => {
        it('Should return 200, when found coupon', async () => {
            //Arrage
            const couponRepository = dataSource.getRepository(Coupon)
            const couponSaved = await couponRepository.save({ ...couponCreateDtos[0] })

            //Act
            const response = await request(app.getHttpServer())
                .get(`/coupons/${couponSaved.id}`)
                .expect(200)

            //Assert
            expect(response.body).toHaveProperty('id')
            expect(response.body).toHaveProperty('name')
            expect(response.body).toHaveProperty('percentage')
            expect(response.body).toHaveProperty('expirationDate')
        })
        it('Should return 404, when does not found coupon', async () => {
            //Arrage
            const couponId = 999
            const expectedErrorMessage = `The Coupon with ID: ${couponId} does not found`

            const response = await request(app.getHttpServer())
                .get(`/coupons/${couponId}`)
                .expect(404)

            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual(expectedErrorMessage)
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'get', '/coupons');
        })
    })
    describe('PATCH /coupons:id', () => {
        it('Should return 200, when coupon is updated', async () => {
            //Arrage
            const createCouponDto: CreateCouponDto = couponCreateDtos[0];
            const updateCouponDto: UpdateCouponDto = couponUpdateDtos[0];
            const couponRepository = dataSource.getRepository(Coupon)

            const couponSaved = await couponRepository.save(createCouponDto)

            //Act
            const response = await request(app.getHttpServer())
                .patch(`/coupons/${couponSaved.id}`)
                .send(updateCouponDto)
                .expect(200)

            const couponInDB = await couponRepository.findOne({ where: { id: response.body.id } })

            //Expect
            expect(couponInDB).toBeDefined
            expect(couponInDB?.name).toBe(updateCouponDto.name)
            expect(couponInDB?.percentage).toBe(updateCouponDto.percentage)
            expect(couponInDB?.expirationDate).toBeInstanceOf(Date)
            expect(couponInDB?.expirationDate.toISOString().split('T')[0]).toBe(updateCouponDto.expirationDate)
        })
        it('Should return 404, when does not found coupon', async () => {
            //Arrage
            const couponId = 999
            const expectedErrorMessage = `The Coupon with ID: ${couponId} does not found`
            const updateCouponDto: UpdateCouponDto = couponUpdateDtos[0];
            const couponRepository = dataSource.getRepository(Coupon)

            //Act
            const response = await request(app.getHttpServer())
                .patch(`/coupons/${couponId}`)
                .send(updateCouponDto)
                .expect(404)

            const couponInDB = await couponRepository.findOne({ where: { id: couponId } })

            //Expect
            expect(couponInDB).not.toBeDefined
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual(expectedErrorMessage)
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'patch', '/coupons');
        })
    })
    describe('DELETE /coupons:id', () => {
        it('Should return 200, when coupon was removed successfully', async () => {
            //Arrange
            const couponRepository = dataSource.getRepository(Coupon)
            const couponSaved = await couponRepository.save({ ...couponCreateDtos[0] })
            const expectedMessage = { message: "Removed coupon" }

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/coupons/${couponSaved.id}`)
                .expect(200)

            const removedCouponInDb = await couponRepository.findOne({
                where: { id: couponSaved.id }
            });

            //Assert
            expect(response.body).toStrictEqual(expectedMessage)
            expect(removedCouponInDb).toBeNull();
        })
        it('Should return 404, when does not found coupon', async () => {
            //Arrage
            const couponId = 999
            const expectedErrorMessage = `The Coupon with ID: ${couponId} does not found`
            const couponRepository = dataSource.getRepository(Coupon)

            //Act
            const response = await request(app.getHttpServer())
                .delete(`/coupons/${couponId}`)
                .expect(404)

            const couponInDB = await couponRepository.findOne({ where: { id: couponId } })

            //Expect
            expect(couponInDB).not.toBeDefined
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual(expectedErrorMessage)
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })
        it('Should return 400 when invalid id', async () => {
            // Act & Assert
            await testInvalidIdE2E(app, 'delete', '/coupons');
        })
    })

    describe('POST /apply-coupon', () => {
        it('Should return 200, when coupon is valid', async () => {
            //Arrage
            const couponRepository = dataSource.getRepository(Coupon)
            const couponCreateDto: CreateCouponDto = couponCreateDtos[0]
            couponCreateDto.expirationDate = addDays(new Date(), 1) as any
            const couponSaved: Coupon = await couponRepository.save(couponCreateDto)
            const couponFound = await couponRepository.findOne({ where: { name: couponSaved.name } })

            const applyCouponDto: ApplyCouponDto = { name: couponSaved.name }
            const expectedResponse = {
                message: 'Valid coupon',
                id: couponFound?.id,
                name: couponFound?.name,
                percentage: couponFound?.percentage,
                expirationDate: couponFound?.expirationDate.toISOString()
            }

            //Act
            const response = await request(app.getHttpServer())
                .post('/coupons/apply-coupon')
                .send(applyCouponDto)
                .expect(200)

            // Assert
            expect(response.body).toStrictEqual(expectedResponse)
        })

        it('Should return 404, when coupon is not found', async () => {
            const couponName = 'non-exist'
            const applyCouponDto: ApplyCouponDto = { name: couponName }
            const expectedErrorMessage = `The Coupon with name: ${couponName} does not found`

            //Act
            const response = await request(app.getHttpServer())
                .post('/coupons/apply-coupon')
                .send(applyCouponDto)
                .expect(404)

            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Not Found')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual(expectedErrorMessage)
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(404)
        })

        it('Should return 422, when coupon is unprocessable', async () => {
            // Arrage
            const couponRepository = dataSource.getRepository(Coupon)
            const couponCreateDto: CreateCouponDto = couponCreateDtos[0]
            couponCreateDto.expirationDate = subDays(new Date(), 1) as any
            await couponRepository.save(couponCreateDto)
            const applyCouponDto: ApplyCouponDto = { name: couponCreateDto.name }
            const expectedErrorMessage = `Expired coupon`

            // Act
            const response = await request(app.getHttpServer())
                .post('/coupons/apply-coupon')
                .send(applyCouponDto)
                .expect(422)

            // Assert 
            expect(response.body).toHaveProperty('error')
            expect(response.body.error).toBe('Unprocessable Entity')
            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toStrictEqual(expectedErrorMessage)
            expect(response.body).toHaveProperty('statusCode')
            expect(response.body.statusCode).toBe(422)
        })
    })
})