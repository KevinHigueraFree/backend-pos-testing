import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  categories,
  categoryCreateDtos,
  categoryUpdateDtos,
  getCategoryById,
  getCategoryUpdatedByIdAndDto,
  productCreateDtos,
  updatedCategories,
} from '../common/test-data';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: Repository<Category>;

  // Mock of repository
  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = categoryCreateDtos[0];
      const expectedCategory = getCategoryById(1);
      mockRepository.save.mockResolvedValue(expectedCategory);

      // Act
      const result = await service.create(createCategoryDto);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(createCategoryDto);
      expect(result).toEqual(expectedCategory);
    });
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      // Arrange
      const expectedCategories = [categories[0], categories[1], categories[3]];
      mockRepository.find.mockResolvedValue(expectedCategories);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(expectedCategories);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a category when found', async () => {
      // Arrange
      const categoryId = 1;
      const expectedCategory = categories[0];
      mockRepository.findOneBy.mockResolvedValue(expectedCategory);

      // Act
      const result = await service.findOne(categoryId);

      // Assert
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: categoryId });
      expect(result).toEqual(expectedCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      const categoryId = 999;
      mockRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(categoryId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(categoryId)).rejects.toThrow(
        `The Category with ID ${categoryId} does not found`
      );
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      // Arrange
      const categoryId = 1;
      const updateDto: UpdateCategoryDto = categoryUpdateDtos[0];
      const existingCategory = getCategoryById(categoryId);
      const expectedUpdatedCategory = getCategoryUpdatedByIdAndDto(categoryId, updateDto);

      // Mock findOne (que llama a findOneBy internamente)
      jest.spyOn(service, 'findOne').mockResolvedValue(existingCategory);
      mockRepository.save.mockResolvedValue(expectedUpdatedCategory);

      // Act
      const result = await service.update(categoryId, updateDto);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(categoryId);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingCategory,
        name: updateDto.name,
      });
      expect(result).toEqual(expectedUpdatedCategory);
    });

    it('should throw NotFoundException when updating non-existent category', async () => {
      // Arrange
      const categoryId = 999;
      const updateDto: UpdateCategoryDto = { name: 'Updated' };
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('The category does not found'));

      // Act & Assert
      await expect(service.update(categoryId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a category successfully', async () => {
      // Arrange
      const categoryId = 1;
      const categoryToRemove = getCategoryById(categoryId);
      jest.spyOn(service, 'findOne').mockResolvedValue(categoryToRemove);
      mockRepository.remove.mockResolvedValue(categoryToRemove);

      // Act
      const result = await service.remove(categoryId);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(categoryId);
      expect(mockRepository.remove).toHaveBeenCalledWith(categoryToRemove);
      expect(result).toBe(`The Category with ID ${categoryId} was removed`);
    });

    it('should throw NotFoundException when removing non-existent category', async () => {
      // Arrange
      const categoryId = 999;
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('The category does not found'));

      // Act & Assert
      await expect(service.remove(categoryId)).rejects.toThrow(NotFoundException);
    });
  });
});
