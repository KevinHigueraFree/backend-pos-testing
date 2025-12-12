import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { testInvalidIdWithServiceValidation } from '../common/test-helpers/validation-test.helper';
import {
  TRANSACTION_TEST_IDS,
  getTransactionContent,
  getExpectedTransaction,
  getTransactionRemovalMessage,
} from '../common/test-data';

describe('TransactionsController', () => {
  let transactionsController: TransactionsController;
  let transactionsService: TransactionsService;

  // Mock of transactions service
  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    transactionsController = module.get<TransactionsController>(TransactionsController);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction successfully without coupon', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        total: 1600,
        coupon: '',
        contents: [
          {
            productId: TRANSACTION_TEST_IDS.productId1,
            quantity: 1,
            price: 1500,
          },
          {
            productId: TRANSACTION_TEST_IDS.productId2,
            quantity: 1,
            price: 800,
          },
        ],
      };

      const expectedResponse = 'Sale storaged correctly';
      mockTransactionsService.create.mockResolvedValue(expectedResponse);

      // Act
      const result = await transactionsController.create(createTransactionDto);

      // Assert
      expect(transactionsService.create).toHaveBeenCalledWith(createTransactionDto);
      expect(result).toBe(expectedResponse);
    });

    it('should create a transaction successfully with coupon', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        total: 1500,
        coupon: 'navidad',
        contents: [
          {
            productId: TRANSACTION_TEST_IDS.productId1,
            quantity: 1,
            price: 1500,
          },
        ],
      };

      const expectedResponse = 'Sale storaged correctly';
      mockTransactionsService.create.mockResolvedValue(expectedResponse);

      // Act
      const result = await transactionsController.create(createTransactionDto);

      // Assert
      expect(transactionsService.create).toHaveBeenCalledWith(createTransactionDto);
      expect(result).toBe(expectedResponse);
    });
  });

  describe('findAll', () => {
    it('should return all transactions filtered by transactionDate', async () => {
      // Arrange
      const transactionDate = '2025-12-11';
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

      const expectedTransactions = [
        getExpectedTransaction(5, '240', 'navidad', '960', '2025-12-11T02:36:49.95Z', [
          transactionContent1,
          transactionContent2,
        ]),
      ];

      mockTransactionsService.findAll.mockResolvedValue(expectedTransactions);

      // Act
      const result = await transactionsController.findAll(transactionDate);

      // Assert
      expect(transactionsService.findAll).toHaveBeenCalledWith(transactionDate);
      expect(result).toEqual(expectedTransactions);
      expect(result).toHaveLength(1);
    });

    it('should return all transactions when no transactionDate is provided', async () => {
      // Arrange
      const expectedTransactions = [
        getExpectedTransaction(1, '500', null, '0', '2025-12-10T10:00:00.00Z', []),
        getExpectedTransaction(2, '240', 'navidad', '960', '2025-12-11T02:36:49.95Z', []),
        getExpectedTransaction(3, '1500', null, '0', '2025-12-12T15:30:00.00Z', []),
      ];

      mockTransactionsService.findAll.mockResolvedValue(expectedTransactions);

      // Act
      const result = await transactionsController.findAll('');

      // Assert
      expect(transactionsService.findAll).toHaveBeenCalledWith('');
      expect(result).toEqual(expectedTransactions);
      expect(result).toHaveLength(3);
    });

    it('should return all transactions when transactionDate is empty string', async () => {
      // Arrange
      const transactionDate = '';
      const expectedTransactions = [
        getExpectedTransaction(1, '500', null, '0', '2025-12-10T10:00:00.00Z', []),
      ];

      mockTransactionsService.findAll.mockResolvedValue(expectedTransactions);

      // Act
      const result = await transactionsController.findAll(transactionDate);

      // Assert
      expect(transactionsService.findAll).toHaveBeenCalledWith(transactionDate);
      expect(result).toEqual(expectedTransactions);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return one transaction found by id', async () => {
      // Arrange
      const transactionId = TRANSACTION_TEST_IDS.transactionId.toString();
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

      mockTransactionsService.findOne.mockResolvedValue(expectedTransaction);

      // Act
      const result = await transactionsController.findOne(transactionId);

      // Assert
      expect(transactionsService.findOne).toHaveBeenCalledWith(+transactionId);
      expect(result).toEqual(expectedTransaction);
    });

    it('should throw BadRequestException for invalid ID in findOne and not call service', async () => {
      // Arrange
      const transactionId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(transactionId, transactionsService, 'findOne');
    });
  });

  describe('remove', () => {
    it('should return message successfully removed transaction', async () => {
      // Arrange
      const transactionId = TRANSACTION_TEST_IDS.transactionId.toString();
      const expectedResponse = getTransactionRemovalMessage(TRANSACTION_TEST_IDS.transactionId);

      mockTransactionsService.remove.mockResolvedValue(expectedResponse);

      // Act
      const result = await transactionsController.remove(transactionId);

      // Assert
      expect(transactionsService.remove).toHaveBeenCalledWith(+transactionId);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException for invalid ID in remove and not call service', async () => {
      // Arrange
      const transactionId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(transactionId, transactionsService, 'remove');
    });
  });
});
