// @ts-nocheck
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionContents } from './entities/transaction.entity';
import { Product } from '../products/entities/product.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CouponsService } from '../coupons/coupons.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  getProductById,
  getCouponByName,
  TRANSACTION_TEST_IDS,
  getTransactionContent,
  getExpectedTransaction,
  getTransactionRemovalMessage,
  getExpectedInventory,
  getTransactionTestData,
} from '../common/test-data';
import { addDays } from 'date-fns';
import { expectServiceNotCalled } from 'src/common/test-helpers/validation-test.helper';

describe('TransactionsService', () => {
  let transactionsService: TransactionsService;
  let transactionRepository: Repository<Transaction>;
  let transactionContentsRepository: Repository<TransactionContents>;
  let productRepository: Repository<Product>;
  let couponsService: CouponsService;

  const mockTransactionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const mockTransactionContentsRepository = {
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  // Mock of transactionEntityManager used inside the transaction
  const mockTransactionEntityManager = {
    findOneBy: jest.fn(),
    save: jest.fn(),
  };

  const mockProductRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockCouponsService = {
    applyCoupon: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionContents),
          useValue: mockTransactionContentsRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    transactionsService = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    transactionContentsRepository = module.get<Repository<TransactionContents>>(
      getRepositoryToken(TransactionContents)
    );
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    couponsService = module.get<CouponsService>(CouponsService);

    // Configure transaction mock to execute callback with transactionEntityManager
    // and return the value returned by the callback
    mockProductRepository.manager.transaction.mockImplementation(async (callback) => {
      const result = await callback(mockTransactionEntityManager);
      return result;
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction successfully without coupon', async () => {
      // Arrange
      const productId1 = 1;
      const productId2 = 2;
      const createTransactionDto: CreateTransactionDto = {
        total: 1600,
        contents: [
          {
            productId: productId1,
            quantity: 1,
            price: 1500,
          },
          {
            productId: productId2,
            quantity: 1,
            price: 800,
          },
        ],
      };

      const mockProduct1 = getProductById(productId1);
      const mockProduct2 = getProductById(productId2);

      mockTransactionEntityManager.findOneBy
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2);

      mockTransactionEntityManager.save.mockResolvedValue({});

      // Act
      const result = await transactionsService.create(createTransactionDto);

      // Assert
      expect(mockProductRepository.manager.transaction).toHaveBeenCalled();
      expect(mockTransactionEntityManager.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockTransactionEntityManager.findOneBy).toHaveBeenNthCalledWith(1, Product, {
        id: productId1,
      });
      expect(mockTransactionEntityManager.findOneBy).toHaveBeenNthCalledWith(2, Product, {
        id: productId2,
      });
      expect(mockTransactionEntityManager.save).toHaveBeenCalled();
      expect(result).toBe('Sale storaged correctly');
    });

    it('should create a transaction successfully with coupon', async () => {
      // Arrange
      const productId = 1;
      const couponName = 'navidad';
      const createTransactionDto: CreateTransactionDto = {
        total: 1500,
        coupon: couponName,
        contents: [
          {
            productId: productId,
            quantity: 1,
            price: 1500,
          },
        ],
      };

      const mockProduct1 = getProductById(productId);
      const mockCoupon = {
        ...getCouponByName(couponName),
        expirationDate: addDays(new Date(), 1),
      };

      mockTransactionEntityManager.findOneBy.mockResolvedValue(mockProduct1);
      mockTransactionEntityManager.save.mockResolvedValue({});
      mockCouponsService.applyCoupon.mockResolvedValue({
        message: 'Valid coupon',
        ...mockCoupon,
      });

      // Act
      const result = await transactionsService.create(createTransactionDto);

      // Assert
      expect(mockCouponsService.applyCoupon).toHaveBeenCalledWith(couponName);
      expect(mockProductRepository.manager.transaction).toHaveBeenCalled();
      expect(mockTransactionEntityManager.findOneBy).toHaveBeenCalledWith(Product, {
        id: productId,
      });
      expect(mockTransactionEntityManager.save).toHaveBeenCalled();
      expect(result).toBe('Sale storaged correctly');
    });

    it('should throw NotFoundException when product does not found', async () => {
      // Arrange
      const productId = TRANSACTION_TEST_IDS.productIdNotFound;

      const createTransactionDto: CreateTransactionDto = {
        total: 1500,
        contents: [
          {
            productId: productId,
            quantity: 1,
            price: 1500,
          },
        ],
      };

      mockTransactionEntityManager.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(transactionsService.create(createTransactionDto)).rejects.toThrow(
        NotFoundException
      );

      expect(mockTransactionEntityManager.findOneBy).toHaveBeenCalledWith(Product, {
        id: productId,
      });

      try {
        await transactionsService.create(createTransactionDto);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          message: expect.arrayContaining([`The Product with ID ${productId} does not found`]),
        });
      }
    });

    it('should throw BadRequestException when product inventory is insufficient', async () => {
      // Arrange
      const productId = 1;
      const createTransactionDto: CreateTransactionDto = {
        total: 1500,
        contents: [
          {
            productId: productId,
            quantity: 100, // Quantity greater than available inventory (25)
            price: 1500,
          },
        ],
      };

      const mockProduct1 = getProductById(productId); // inventory: 25

      mockTransactionEntityManager.findOneBy.mockResolvedValue(mockProduct1);

      // Act & Assert
      await expect(transactionsService.create(createTransactionDto)).rejects.toThrow(
        BadRequestException
      );

      expect(mockTransactionEntityManager.findOneBy).toHaveBeenCalledWith(Product, {
        id: productId,
      });

      try {
        await transactionsService.create(createTransactionDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          message: expect.arrayContaining([expect.stringContaining('exced the enable quantity')]),
        });
      }
    });

    it('should update product inventory correctly', async () => {
      // Arrange
      const productId = 1;
      const createTransactionDto: CreateTransactionDto = {
        total: 1500,
        contents: [
          {
            productId: productId,
            quantity: 5,
            price: 1500,
          },
        ],
      };

      const mockProduct1 = { ...getProductById(productId), inventory: 25 };
      const initialInventory = mockProduct1.inventory;

      mockTransactionEntityManager.findOneBy.mockResolvedValue(mockProduct1);
      mockTransactionEntityManager.save.mockResolvedValue({});

      // Act
      await transactionsService.create(createTransactionDto);

      // Assert
      expect(mockTransactionEntityManager.findOneBy).toHaveBeenCalledWith(Product, {
        id: productId,
      });
      // Verify that product inventory was updated in memory
      expect(mockProduct1.inventory).toBe(initialInventory - 5); // 25 - 5 = 20
      expect(mockTransactionEntityManager.save).toHaveBeenCalled();
    });

    it('should calculate discount correctly when coupon is applied', async () => {
      // Arrange
      const productId = 1;
      const couponName = 'navidad';
      const couponPercentage = 20;
      const total = 1500;
      const expectedDiscount = (couponPercentage / 100) * total; // 300
      const finalTotal = total - expectedDiscount; // 1200

      const createTransactionDto: CreateTransactionDto = {
        total: total,
        coupon: couponName,
        contents: [
          {
            productId: productId,
            quantity: 1,
            price: 1500,
          },
        ],
      };

      const mockProduct1 = getProductById(productId);
      const mockCoupon = {
        ...getCouponByName(couponName),
        percentage: couponPercentage,
        expirationDate: addDays(new Date(), 1),
      };

      mockTransactionEntityManager.findOneBy.mockResolvedValue(mockProduct1);
      mockTransactionEntityManager.save.mockResolvedValue({});
      mockCouponsService.applyCoupon.mockResolvedValue({
        message: 'Valid coupon',
        ...mockCoupon,
      });

      // Act
      await transactionsService.create(createTransactionDto);

      // Assert
      expect(mockCouponsService.applyCoupon).toHaveBeenCalledWith(couponName);
      // Verify that transaction was saved with correct discount
      // Service saves transaction multiple times, the last one must have discount applied
      const savedCalls = mockTransactionEntityManager.save.mock.calls;
      // Find the last call that saves a transaction (not TransactionContents)
      const transactionSaves = savedCalls.filter(
        (call) => call[0].hasOwnProperty('total') && call[0].hasOwnProperty('discount')
      );
      const lastTransactionSave = transactionSaves[transactionSaves.length - 1];

      expect(lastTransactionSave).toBeDefined();
      expect(lastTransactionSave[0].discount).toBe(expectedDiscount);
      expect(lastTransactionSave[0].coupon).toBe(couponName);
      expect(lastTransactionSave[0].total).toBe(finalTotal);
    });
  });

  describe('findAll', () => {
    it('Should return all transaction filtered by transactionDate', async () => {
      // Arrange
      const transactionDate = '2025-12-11';
      const transactionsExpected = [
        {
          id: 5,
          total: '240',
          coupon: 'navidad',
          discount: '960',
          transactionDate: '2025-12-11T02:36:49.95Z',
          contents: [
            {
              id: 1,
              quantity: 2,
              price: '100',
              product: {
                id: 4,
                name: 'Sudadera Blanca',
                image: '4.jpg',
                price: '29',
                inventory: 8,
              },
            },
            {
              id: 2,
              quantity: 10,
              price: '100',
              product: {
                id: 5,
                name: 'Sudadera Negra / Naranja',
                image: '5.jpg',
                price: '49',
                inventory: 0,
              },
            },
          ],
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(transactionsExpected);

      // Act
      const result = await transactionsService.findAll(transactionDate);

      // Assert
      expect(mockTransactionRepository.find).toHaveBeenCalled();
      expect(result).toEqual(transactionsExpected);
    });

    it('Should return all transactions when no transactionDate is provided', async () => {
      // Arrange
      const allTransactions = [
        {
          id: 1,
          total: '500',
          coupon: null,
          discount: '0',
          transactionDate: '2025-12-10T10:00:00.00Z',
          contents: [],
        },
        {
          id: 2,
          total: '240',
          coupon: 'navidad',
          discount: '960',
          transactionDate: '2025-12-11T02:36:49.95Z',
          contents: [],
        },
        {
          id: 3,
          total: '1500',
          coupon: null,
          discount: '0',
          transactionDate: '2025-12-12T15:30:00.00Z',
          contents: [],
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(allTransactions);

      // Act
      const result = await transactionsService.findAll(null);

      // Assert
      expect(mockTransactionRepository.find).toHaveBeenCalledWith({
        relations: {
          contents: true,
        },
      });
      expect(result).toEqual(allTransactions);
    });

    it('Should return all transactions when transactionDate is empty string', async () => {
      // Arrange
      const allTransactions = [
        {
          id: 1,
          total: '500',
          coupon: null,
          discount: '0',
          transactionDate: '2025-12-10T10:00:00.00Z',
          contents: [],
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(allTransactions);

      // Act
      const result = await transactionsService.findAll('');

      // Assert
      expect(mockTransactionRepository.find).toHaveBeenCalledWith({
        relations: {
          contents: true,
        },
      });
      expect(result).toEqual(allTransactions);
    });

    it('Should throw BadRequestException when transactionDate is invalid', async () => {
      // Arrange
      const invalidDate = 'invalid-date-string';

      // Act & Assert

      try {
        await transactionsService.findAll(invalidDate);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid Date',
        });
      }
      expect(mockTransactionRepository.find).not.toHaveBeenCalled();
    });

    it('Should return empty array when no transactions found for the date', async () => {
      // Arrange
      const transactionDate = '2025-12-11';
      const emptyTransactions: Transaction[] = [];

      mockTransactionRepository.find.mockResolvedValue(emptyTransactions);

      // Act
      const result = await transactionsService.findAll(transactionDate);

      // Assert
      expect(mockTransactionRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    (it('Should return one transaction found by id successfully', async () => {
      // Arrange
      const transactionId = TRANSACTION_TEST_IDS.transactionId;
      const transactionContent1 = getTransactionContent(
        TRANSACTION_TEST_IDS.transactionContentId1,
        TRANSACTION_TEST_IDS.productId1,
        2,
        '100'
      );
      const transactionContent2 = getTransactionContent(
        TRANSACTION_TEST_IDS.transactionContentId2,
        TRANSACTION_TEST_IDS.productId2,
        10,
        '100'
      );

      const expectedTransaction = getExpectedTransaction(
        5,
        '240',
        'navidad',
        '960',
        '2025-12-11T02:36:49.95Z',
        [transactionContent1, transactionContent2]
      );
      mockTransactionRepository.findOne.mockResolvedValue(expectedTransaction);

      // Act
      const result = await transactionsService.findOne(transactionId);

      // Assert
      expect(transactionRepository.findOne).toHaveBeenCalled();
      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: transactionId,
        },
        relations: {
          contents: true,
        },
      });
      expect(result).toEqual(expectedTransaction);
    }),
      it('Should return NotFoundException, not found the transaction by id', async () => {
        // Arrange
        const transactionId = TRANSACTION_TEST_IDS.transactionIdNotFound;
        mockTransactionRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(transactionsService.findOne(transactionId)).rejects.toThrow(NotFoundException);

        // Additional Assert

        try {
          await transactionsService.findOne(transactionId);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.response.message).toContain(
            `The Transaction with ID ${transactionId} does not found`
          );
        }
        expect(transactionRepository.findOne).toHaveBeenCalled();
        expect(transactionRepository.findOne).toHaveBeenCalledWith({
          where: { id: transactionId },
          relations: { contents: true },
        });
      }));
  });
  describe('remove', () => {
    it('Should return removed transaction succesfully', async () => {
      // Arrange
      const {
        transactionId,
        transactionContentId1,
        transactionContentId2,
        productId1,
        productId2,
        product1,
        product2,
        transactionContent1,
        transactionContent2,
        expectedMessage,
        expectedInventory1,
        expectedInventory2,
        existTransaction,
      } = getTransactionTestData();

      jest.spyOn(transactionsService, 'findOne').mockResolvedValue(existTransaction);
      mockProductRepository.findOneBy
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);
      mockProductRepository.save.mockResolvedValue({});
      mockTransactionContentsRepository.findOneBy
        .mockResolvedValueOnce(transactionContent1)
        .mockResolvedValueOnce(transactionContent2);
      mockTransactionContentsRepository.remove.mockResolvedValue({});
      mockTransactionRepository.remove.mockResolvedValue({});

      // Act
      const result = await transactionsService.remove(transactionId);

      // Assert
      expect(transactionsService.findOne).toHaveBeenCalledWith(transactionId);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId1 });
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId2 });
      expect(mockProductRepository.save).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.save).toHaveBeenCalledWith({
        ...product1,
        inventory: expectedInventory1,
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith({
        ...product2,
        inventory: expectedInventory2,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId1,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId2,
      });
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledWith(transactionContent1);
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledWith(transactionContent2);
      expect(mockTransactionRepository.remove).toHaveBeenCalledWith(existTransaction);
      expect(result).toEqual(expectedMessage);
    });

    it('Should return NotFoundException transaction', async () => {
      // Arrange
      const transactionId = TRANSACTION_TEST_IDS.transactionId;
      jest.spyOn(transactionsService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(transactionsService.remove(transactionId)).rejects.toThrow(NotFoundException);

      // Additional Assert

      try {
        await transactionsService.remove(transactionId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.response.message).toContain(
          `The Transaction with ID ${transactionId} does not found`
        );
      }

      expect(transactionsService.findOne).toHaveBeenCalledWith(transactionId);
      expect(mockProductRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(mockTransactionContentsRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockTransactionContentsRepository.remove).not.toHaveBeenCalled();
      expect(mockTransactionRepository.remove).not.toHaveBeenCalled();
    });

    it('Should return removed transaction succesfully with product does not found', async () => {
      // Arrange
      const {
        transactionId,
        transactionContentId1,
        transactionContentId2,
        productId1,
        productId2,
        transactionContent1,
        transactionContent2,
        expectedMessage,
        existTransaction,
      } = getTransactionTestData();

      jest.spyOn(transactionsService, 'findOne').mockResolvedValue(existTransaction);
      mockProductRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockTransactionContentsRepository.findOneBy
        .mockResolvedValueOnce(transactionContent1)
        .mockResolvedValueOnce(transactionContent2);
      mockTransactionContentsRepository.remove.mockResolvedValue({});
      mockTransactionRepository.remove.mockResolvedValue({});

      // Act
      const result = await transactionsService.remove(transactionId);

      // Assert
      expect(transactionsService.findOne).toHaveBeenCalledWith(transactionId);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId1 });
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId2 });
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId1,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId2,
      });
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledWith(transactionContent1);
      expect(mockTransactionContentsRepository.remove).toHaveBeenCalledWith(transactionContent2);
      expect(mockTransactionRepository.remove).toHaveBeenCalledWith(existTransaction);
      expect(result).toEqual(expectedMessage);
    });

    it('Should return removed transaction succesfully with transaction contents does not found', async () => {
      // Arrange
      const {
        transactionId,
        transactionContentId1,
        transactionContentId2,
        productId1,
        productId2,
        product1,
        product2,
        transactionContent1,
        transactionContent2,
        expectedMessage,
        expectedInventory1,
        expectedInventory2,
        existTransaction,
      } = getTransactionTestData();

      jest.spyOn(transactionsService, 'findOne').mockResolvedValue(existTransaction);
      mockProductRepository.findOneBy
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);
      mockProductRepository.save.mockResolvedValue({});
      mockTransactionContentsRepository.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockTransactionRepository.remove.mockResolvedValue({});

      // Act
      const result = await transactionsService.remove(transactionId);

      // Assert
      expect(transactionsService.findOne).toHaveBeenCalledWith(transactionId);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId1 });
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId2 });
      expect(mockProductRepository.save).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.save).toHaveBeenCalledWith({
        ...product1,
        inventory: expectedInventory1,
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith({
        ...product2,
        inventory: expectedInventory2,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId1,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId2,
      });
      expect(mockTransactionContentsRepository.remove).not.toHaveBeenCalled();
      expect(mockTransactionRepository.remove).toHaveBeenCalledWith(existTransaction);
      expect(result).toEqual(expectedMessage);
    });

    it('Should return removed transaction succesfully with product does not found and transaction contents does not found', async () => {
      // Arrange
      const {
        transactionId,
        transactionContentId1,
        transactionContentId2,
        productId1,
        productId2,
        expectedMessage,
        existTransaction,
      } = getTransactionTestData();

      jest.spyOn(transactionsService, 'findOne').mockResolvedValue(existTransaction);
      mockProductRepository.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockTransactionContentsRepository.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockTransactionRepository.remove.mockResolvedValue({});

      // Act
      const result = await transactionsService.remove(transactionId);

      // Assert
      expect(transactionsService.findOne).toHaveBeenCalledWith(transactionId);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId1 });
      expect(mockProductRepository.findOneBy).toHaveBeenCalledWith({ id: productId2 });
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId1,
      });
      expect(mockTransactionContentsRepository.findOneBy).toHaveBeenCalledWith({
        id: transactionContentId2,
      });
      expect(mockTransactionContentsRepository.remove).not.toHaveBeenCalled();
      expect(mockTransactionRepository.remove).toHaveBeenCalledWith(existTransaction);
      expect(result).toEqual(expectedMessage);
    });
  });
});
