// @ts-nocheck
import { Repository } from "typeorm";
import { Coupon } from "./entities/coupon.entity";
import { CouponsService } from "./coupons.service";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { addDays, subDays } from 'date-fns';
import {
    coupons,
    couponCreateDtos,
    couponUpdateDtos,
    getCouponById,
    getCouponByName, getCouponUpdatedByIdAndDto
} from "../common/test-data";

describe('CouponsService', () => {
    let couponsService: CouponsService;
    let couponRepository: Repository<Coupon>;

    // Mock del repository de couponos
    const mockCouponRepository = {
        save: jest.fn(),
        find: jest.fn(),
        findOneBy: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CouponsService,
                {
                    provide: getRepositoryToken(Coupon),
                    useValue: mockCouponRepository,
                }
            ],
        }).compile();

        couponsService = module.get<CouponsService>(CouponsService);
        couponRepository = module.get<Repository<Coupon>>(getRepositoryToken(Coupon));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new coupon', async () => {
            const couponCreateDto = couponCreateDtos[0]
            const expectedCoupon: Coupon = { ...couponCreateDto, id: 1 }
            mockCouponRepository.save.mockResolvedValue(expectedCoupon)

            //Act
            const result = await couponsService.create(couponCreateDto)

            //Assert
            expect(couponRepository.save).toHaveBeenCalledWith(couponCreateDto)
            expect(result).toEqual(expectedCoupon)
        })
    })

    describe('findAll', () => {
        it('should return all coupons', async () => {
            const expectedCoupons = coupons.slice(0, 3)
            mockCouponRepository.find.mockResolvedValue(expectedCoupons)

            //Act
            const result = await couponsService.findAll()

            //Asserts
            expect(mockCouponRepository.find).toHaveBeenCalled()
            expect(result).toHaveLength(expectedCoupons.length)
            expect(result).toEqual(expectedCoupons)
        })
        it('should return empty because there are not coupons', async () => {

            mockCouponRepository.find.mockResolvedValue([])

            //Act
            const result = await couponsService.findAll()

            //Asserts
            expect(mockCouponRepository.find).toHaveBeenCalled()
            expect(result).toHaveLength(0)
            expect(result).toEqual([])
        })
    })

    describe('findOne', () => {
        it('Should return the found coupon', async () => {
            const couponId = 1;
            const expectedCoupon = getCouponById(couponId)
            mockCouponRepository.findOneBy.mockResolvedValue(expectedCoupon)

            //Act
            const result = await couponsService.findOne(couponId)

            //Assert
            expect(mockCouponRepository.findOneBy).toHaveBeenCalledWith({ id: couponId })
            expect(result).toEqual(expectedCoupon)

        }),
            it('Should return one error because does not found the coupon', async () => {
                const couponId = 999
                mockCouponRepository.findOneBy.mockResolvedValue(null)

                //Act y Assert
                await expect(couponsService.findOne(couponId)).rejects.toThrow(NotFoundException);

                //Assert
                try {
                    await couponsService.findOne(couponId);
                } catch (error) {
                    expect(error).toBeInstanceOf(NotFoundException);
                    expect(error.response.message).toContain(`The coupon with ID: ${couponId} does not found`);
                }
                expect(mockCouponRepository.findOneBy).toHaveBeenCalledWith({ id: couponId })
                // expect(result).toEqual('')
            })
    })
    describe('update', () => {
        it('should return updated coupon', async () => {
            const couponId = 1
            const updateCouponDto = couponUpdateDtos[0]
            const existingCoupon = getCouponById(couponId)
            const expectedCoupon = getCouponUpdatedByIdAndDto(couponId, updateCouponDto)
            const findOneSpy = jest.spyOn(couponsService, 'findOne').mockResolvedValue(existingCoupon);
            mockCouponRepository.save.mockResolvedValue(expectedCoupon)

            //Act
            const result = await couponsService.update(couponId, updateCouponDto)

            //Assert
            expect(findOneSpy).toHaveBeenCalledWith(couponId)
            expect(mockCouponRepository.save).toHaveBeenCalledWith({ ...existingCoupon, ...updateCouponDto })
            expect(result).toEqual(expectedCoupon)
        })
        it('Should return exception because does not found the coupon', async () => {
            const couponId = 999
            const updateCouponDto = couponUpdateDtos[0]
            const notFoundException = new NotFoundException(`The coupon with ID: ${couponId} does not found`);
            const findOneSpy = jest.spyOn(couponsService, 'findOne').mockRejectedValue(notFoundException);

            //Act y Assert
            const promise = couponsService.update(couponId, updateCouponDto);
            await expect(promise).rejects.toThrow(NotFoundException);
            //Assert adicionales
            expect(findOneSpy).toHaveBeenCalledWith(couponId)
            expect(mockCouponRepository.save).not.toHaveBeenCalled()
        })
    })
    describe('remove', () => {
        it('should return message removed coupon', async () => {
            const couponId = 1
            const existingCoupon = getCouponById(couponId)
            const expectedResponse = { message: "Removed coupon" }
            const findOneSpy = jest.spyOn(couponsService, 'findOne').mockResolvedValue(existingCoupon);
            mockCouponRepository.remove.mockResolvedValue(existingCoupon)

            //Act
            const result = await couponsService.remove(couponId)

            //Assert
            expect(findOneSpy).toHaveBeenCalledWith(couponId)
            expect(mockCouponRepository.remove).toHaveBeenCalledWith(existingCoupon)
            expect(result).toEqual(expectedResponse)
        })
        it('Should return exception because does not found the coupon', async () => {
            const couponId = 999
            const notFoundException = new NotFoundException(`The coupon with ID: ${couponId} does not found`);
            const findOneSpy = jest.spyOn(couponsService, 'findOne').mockRejectedValue(notFoundException);

            //Act y Assert
            const promise = couponsService.remove(couponId);
            await expect(promise).rejects.toThrow(NotFoundException);

            //Assert adicionales
            expect(findOneSpy).toHaveBeenCalledWith(couponId)
            expect(mockCouponRepository.remove).not.toHaveBeenCalled()
        })
    })
    describe('applyCoupon', () => {
        it('should return message valid coupon', async () => {
            const couponName = 'navidad'
            const existingCoupon: Coupon = { ...getCouponByName(couponName) }
            // Asegurar que la fecha de expiración sea siempre en el futuro (mañana)
            existingCoupon.expirationDate = addDays(new Date(), 1) as any

            const expectedResponse = {
                message: 'Valid coupon',
                ...existingCoupon
            }
            mockCouponRepository.findOneBy.mockResolvedValue(existingCoupon)

            //Act
            const result = await couponsService.applyCoupon(couponName)

            //Assert
            expect(mockCouponRepository.findOneBy).toHaveBeenCalledWith({ name: couponName })
            expect(result).toEqual(expectedResponse)
        })
        it('Should return exception because does not found the coupon', async () => {
            const couponName = 'nonexistent'
            mockCouponRepository.findOneBy.mockResolvedValue(null)

            //Act y Assert
            const promise = couponsService.applyCoupon(couponName);
            await expect(promise).rejects.toThrow(NotFoundException);

            //Assert adicionales
            expect(mockCouponRepository.findOneBy).toHaveBeenCalledWith({ name: couponName })
        })
        it('Should return exception because coupon is expired', async () => {
            const couponName = 'navidad'
            const expiredCoupon: Coupon = { ...getCouponByName(couponName) }
            // Establecer fecha de expiración en el pasado (ayer)
            expiredCoupon.expirationDate = subDays(new Date(), 1) as any
            mockCouponRepository.findOneBy.mockResolvedValue(expiredCoupon)

            //Act y Assert
            const promise = couponsService.applyCoupon(couponName);
            await expect(promise).rejects.toThrow(UnprocessableEntityException);

            //Assert adicionales
            expect(mockCouponRepository.findOneBy).toHaveBeenCalledWith({ name: couponName })
        })
    })
})