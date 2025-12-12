import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { testInvalidIdWithServiceValidation } from '../common/test-helpers/validation-test.helper';
import {
  coupons,
  couponCreateDtos,
  couponUpdateDtos,
  getCouponById,
  getCouponUpdatedByIdAndDto,
  getCouponByName,
} from '../common/test-data';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Coupon } from './entities/coupon.entity';

describe('CouponsController', () => {
  let couponsController: CouponsController;
  let couponsService: CouponsService;

  // Mock of coupons repository
  const mockCouponsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    applyCoupon: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    couponsController = module.get<CouponsController>(CouponsController);
    couponsService = module.get<CouponsService>(CouponsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new coupon', async () => {
      // Arrange
      const couponCreateDto = couponCreateDtos[0];
      const expectedCoupon: Coupon = { ...couponCreateDto, id: 1 };
      mockCouponsService.create.mockResolvedValue(expectedCoupon);

      // Act
      const result = await couponsController.create(couponCreateDto);

      // Assert
      expect(couponsService.create).toHaveBeenCalledWith(couponCreateDto);
      expect(result).toEqual(expectedCoupon);
    });
  });
  describe('findAll', () => {
    it('should return all coupons', async () => {
      // Arrange
      const expectedCoupons = coupons.slice(0, 3);
      mockCouponsService.findAll.mockResolvedValue(expectedCoupons);

      // Act
      const result = await couponsController.findAll();

      // Assert
      expect(mockCouponsService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(expectedCoupons.length);
      expect(result).toEqual(expectedCoupons);
    });
  });
  describe('findOne', () => {
    it('Should return the found coupon', async () => {
      // Arrange
      const couponId = '1';
      const expectedCoupon = getCouponById(+couponId);
      mockCouponsService.findOne.mockResolvedValue(expectedCoupon);

      // Act
      const result = await couponsController.findOne(couponId);

      // Assert
      expect(mockCouponsService.findOne).toHaveBeenCalledWith(+couponId);
      expect(result).toEqual(expectedCoupon);
    });
    it('should throw BadRequestException for invalid ID in findOne and not call service', async () => {
      // Arrange
      const couponId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(couponId, couponsService, 'findOne');
    });
  });

  describe('update', () => {
    it('should return updated coupon', async () => {
      // Arrange
      const couponId = '1';
      const updateCouponDto = couponUpdateDtos[0];
      const expectedCoupon = getCouponUpdatedByIdAndDto(+couponId, updateCouponDto);
      mockCouponsService.update.mockResolvedValue(expectedCoupon);

      // Act
      const result = await couponsController.update(couponId, updateCouponDto);

      // Assert
      expect(mockCouponsService.update).toHaveBeenCalledWith(+couponId, updateCouponDto);
      expect(result).toEqual(expectedCoupon);
    });
    it('should throw BadRequestException for invalid ID in update and not call service', async () => {
      // Arrange
      const couponId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(couponId, couponsService, 'update');
    });
  });

  describe('remove', () => {
    it('should return message removed coupon', async () => {
      // Arrange
      const couponId = '1';
      const expectedResponse = { message: 'Removed coupon' };
      mockCouponsService.remove.mockResolvedValue(expectedResponse);

      // Act
      const result = await couponsController.remove(couponId);

      // Assert
      expect(mockCouponsService.remove).toHaveBeenCalledWith(+couponId);
      expect(result).toEqual(expectedResponse);
    });
    it('should throw BadRequestException for invalid ID in remove and not call service', async () => {
      // Arrange
      const couponId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(couponId, couponsService, 'remove');
    });
  });

  describe('applyCoupon', () => {
    it('should return message valid coupon', async () => {
      // Arrange
      const couponName = 'navidad';
      const applyCouponDto = { name: couponName };
      const coupon = getCouponByName(couponName);
      const expectedResponse = {
        message: 'Valid coupon',
        ...coupon,
      };
      mockCouponsService.applyCoupon.mockResolvedValue(expectedResponse);

      // Act
      const result = await couponsController.applyCoupon(applyCouponDto);

      // Assert
      expect(mockCouponsService.applyCoupon).toHaveBeenCalledWith(couponName);
      expect(result).toEqual(expectedResponse);
    });
    it('Should return exception because does not found the coupon', async () => {
      // Arrange
      const couponName = 'nonexistent';
      const applyCouponDto = { name: couponName };
      const error = new NotFoundException(`The Coupon with name: ${couponName} does not found`);
      mockCouponsService.applyCoupon.mockRejectedValue(error);

      // Act & Assert
      const promise = couponsController.applyCoupon(applyCouponDto);
      await expect(promise).rejects.toThrow(NotFoundException);

      // Additional Assert
      expect(mockCouponsService.applyCoupon).toHaveBeenCalledWith(couponName);
    });
    it('Should return exception because coupon is expired', async () => {
      // Arrange
      const couponName = 'expired-coupon';
      const applyCouponDto = { name: couponName };
      const error = new UnprocessableEntityException('Expired coupon');
      mockCouponsService.applyCoupon.mockRejectedValue(error);

      // Act & Assert
      const promise = couponsController.applyCoupon(applyCouponDto);
      await expect(promise).rejects.toThrow(UnprocessableEntityException);

      // Additional Assert
      expect(mockCouponsService.applyCoupon).toHaveBeenCalledWith(couponName);
    });
  });
});
