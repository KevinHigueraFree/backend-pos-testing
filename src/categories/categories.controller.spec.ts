import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { NotFoundException } from '@nestjs/common';
import { testInvalidIdWithServiceValidation } from '../common/test-helpers/validation-test.helper';
import { 
  categories, 
  categoryCreateDtos, 
  categoryUpdateDtos, 
  categoriesWithProducts,
  getCategoryById,
  getCategoryUpdatedByIdAndDto
} from '../common/test-data';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  // Mock del servicio
  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      // Arrange
      const createCategoryDto = categoryCreateDtos[0];
      const expectedCategory = getCategoryById(1);
      mockCategoriesService.create.mockResolvedValue(expectedCategory);

      // Act
      const result = await controller.create(createCategoryDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
      expect(result).toEqual(expectedCategory);
    });
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      // Arrange
      const expectedCategories = categoriesWithProducts;
      mockCategoriesService.findAll.mockResolvedValue(expectedCategories);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedCategories);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      // Arrange
      const categoryId = '1';
      const expectedCategory = getCategoryById(+categoryId);
      mockCategoriesService.findOne.mockResolvedValue(expectedCategory);

      // Act
      const result = await controller.findOne(categoryId);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(1); // +id convierte string a number
      expect(result).toEqual(expectedCategory);
    });

    it('should handle NotFoundException', async () => {
      // Arrange
      const categoryId = '999';
      mockCategoriesService.findOne.mockRejectedValue(new NotFoundException(`The Category with ID ${categoryId} does not found`));

      // Act & Assert
      await expect(controller.findOne(categoryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ID and not call service', async () => {
      //Arrage
      const categoryId = 'invalid-id';

      // Act & Assert - Usar función helper reutilizable
      await testInvalidIdWithServiceValidation(categoryId, service, 'findOne');
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      // Arrange
      const categoryId = '1';
      const updateCategoryDto: UpdateCategoryDto = categoryUpdateDtos[0];
      const updatedCategory = getCategoryUpdatedByIdAndDto(+categoryId, updateCategoryDto);
      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await controller.update(categoryId, updateCategoryDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(1, updateCategoryDto);
      expect(result).toEqual(updatedCategory);
    });

    it('should handle NotFoundException when updating', async () => {
      // Arrange
      const categoryId = '999';
      const updateCategoryDto: UpdateCategoryDto = { name: 'Updated' };
      mockCategoriesService.update.mockRejectedValue(new NotFoundException('The category does not found'));

      // Act & Assert
      await expect(controller.update(categoryId, updateCategoryDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ID in update and not call service', async () => {
      //Arrage
      const categoryId = 'invalid-id';

      // Act & Assert - Usar función helper reutilizable
      await testInvalidIdWithServiceValidation(categoryId, service, 'update');
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      // Arrange
      const categoryId = '1';
      const expectedMessage = `The Category with ID ${categoryId} was removed`;
      mockCategoriesService.remove.mockResolvedValue(expectedMessage);

      // Act
      const result = await controller.remove(categoryId);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBe(expectedMessage);
    });

    it('should handle NotFoundException when removing', async () => {
      // Arrange
      const categoryId = '999';
      mockCategoriesService.remove.mockRejectedValue(new NotFoundException('The category does not found'));

      // Act & Assert
      await expect(controller.remove(categoryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ID in remove and not call service', async () => {
      //Arrage
      const categoryId = 'invalid-id';

      // Act & Assert - Usar función helper reutilizable
      await testInvalidIdWithServiceValidation(categoryId, service, 'remove');
    });
  });
});
