import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from '../categories/categories.service';
import { testInvalidIdWithServiceValidation } from '../common/test-helpers/validation-test.helper';
import {
  productCreateDtos,
  productUpdateDtos,
  getProductById,
  getCategoryById,
  getProductsByCategory,
  getProductUpdatedByIdAndDto,
} from '../common/test-data';

describe('ProductsController', () => {
  let productsController: ProductsController;
  let productsService: ProductsService;

  // Mock of products service
  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // Mock of categories service
  const mockCategoriesService = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    productsController = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      // Arrange
      const createProductDto = productCreateDtos[0];
      const expectedProduct = {
        ...getProductById(1),
        category: getCategoryById(1),
      };

      mockProductsService.create.mockResolvedValue(expectedProduct);

      // Act
      const result = await productsController.create(createProductDto);

      // Assert
      expect(productsService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(expectedProduct);
    });
  });

  describe('findAll', () => {
    it('should return all products filtered', async () => {
      // Arrange
      const categoryId = 2;
      const query = {
        category_id: categoryId,
        take: 3,
        skip: 10,
      };
      const expectedProducts = getProductsByCategory(categoryId).map((product) => ({
        ...product,
        category: getCategoryById(categoryId),
      }));

      mockProductsService.findAll.mockResolvedValue(expectedProducts);

      // Act
      const result = await productsController.findAll(query);

      // Assert
      expect(productsService.findAll).toHaveBeenCalledWith(
        query.category_id,
        query.take,
        query.skip
      );
      expect(result).toEqual(expectedProducts);
    });
  });
  describe('findOne', () => {
    it('should return one product found for id', async () => {
      // Arrange
      const productId = '3';
      const expectedProduct = {
        ...getProductById(+productId),
        category: getCategoryById(2),
      };

      mockProductsService.findOne.mockResolvedValue(expectedProduct);

      // Act
      const result = await productsController.findOne(productId);

      // Assert
      expect(productsService.findOne).toHaveBeenCalledWith(+productId);
      expect(result).toEqual(expectedProduct);
    });

    it('should throw BadRequestException for invalid ID and not call service', async () => {
      // Arrange
      const productId = 'abc';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(productId, productsService, 'findOne');
    });
  });
  describe('update', () => {
    it('should update and return the product updated', async () => {
      // Arrange
      const productId = '3';
      const updateProductDto = productUpdateDtos[1];
      const expectedUpdatedProduct = getProductUpdatedByIdAndDto(+productId, updateProductDto);

      mockProductsService.update.mockResolvedValue(expectedUpdatedProduct);

      // Act
      const result = await productsController.update(productId, updateProductDto);

      // Assert
      expect(productsService.update).toHaveBeenCalledWith(+productId, updateProductDto);
      expect(result).toEqual(expectedUpdatedProduct);
    });

    it('should throw BadRequestException for invalid ID in update and not call service', async () => {
      // Arrange
      const productId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(productId, productsService, 'update');
    });
  });
  describe('remove', () => {
    it('should return a message sucessfully remove product', async () => {
      // Arrange
      const productId = '3';
      const expectedResponse = `The Product with ID ${productId} was removed`;
      mockProductsService.remove.mockResolvedValue(expectedResponse);

      // Act
      const result = await productsController.remove(productId);

      // Assert
      expect(productsService.remove).toHaveBeenLastCalledWith(+productId);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException for invalid ID in remove and not call service', async () => {
      // Arrange
      const productId = 'invalid-id';

      // Act & Assert - Use reusable helper function
      await testInvalidIdWithServiceValidation(productId, productsService, 'remove');
    });
  });
});
