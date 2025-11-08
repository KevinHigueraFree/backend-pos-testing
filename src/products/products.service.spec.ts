// @ts-nocheck
import { Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { ProductsService } from "./products.service";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CreateProductDto } from "./dto/create-product.dto";
import { Category } from "../categories/entities/category.entity";
import { NotFoundException } from "@nestjs/common";
import { UpdateProductDto } from "./dto/update-product.dto";
import { categoriesWithoutProducts, getCategoryById, getProductById, getProductByIdWithCategory, getProductUpdatedByIdAndDto, getProductsByCategoryWithCategory, getProductsWithCategory, productCreateDtos, productUpdateDtos } from "../common/test-data";

describe('ProductsService', () => {
    let productsService: ProductsService;
    let productRepository: Repository<Product>;
    let categoryRepository: Repository<Category>;

    // Mock del repository de productos
    const mockProductRepository = {
        save: jest.fn(),
        find: jest.fn(),
        findAndCount: jest.fn(),
        findOneBy: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    // Mock del repository de categorías
    const mockCategoryRepository = {
        findOneBy: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: getRepositoryToken(Product),
                    useValue: mockProductRepository,
                },
                {
                    provide: getRepositoryToken(Category),
                    useValue: mockCategoryRepository,
                },
            ],
        }).compile();

        productsService = module.get<ProductsService>(ProductsService);
        productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
        categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new product when category exists', async () => {
            // Arrange
            const createProductDto: CreateProductDto = productCreateDtos[0];
            const mockCategory = getCategoryById(1);
            const expectedProduct = { ...getProductById(1), category: mockCategory }

            mockCategoryRepository.findOneBy.mockResolvedValue(mockCategory);
            mockProductRepository.save.mockResolvedValue(expectedProduct);

            // Act
            const result = await productsService.create(createProductDto);

            // Assert
            expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
            expect(mockProductRepository.save).toHaveBeenCalledWith({
                ...createProductDto,
                category: mockCategory
            });
            expect(result).toEqual(expectedProduct);
        });

        it('should create a new product when category exists and image is not empty', async () => {
            // Arrange
            const createProductDto: CreateProductDto = productCreateDtos[0]
            const mockCategory = getCategoryById(1);
            const expectedProduct = getProductById(1);

            mockCategoryRepository.findOneBy.mockResolvedValue(mockCategory);
            mockProductRepository.save.mockResolvedValue(expectedProduct);

            // Act
            const result = await productsService.create(createProductDto);

            // Assert
            expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
            expect(mockProductRepository.save).toHaveBeenCalledWith({
                ...createProductDto,
                category: mockCategory
            });
            expect(result).toEqual(expectedProduct);
        });

        it('should throw NotFoundException when category does not found', async () => {
            // Arrange
            const categoryId = 999
            const createProductDto: CreateProductDto = { ...productCreateDtos[0], categoryId: categoryId };

            mockCategoryRepository.findOneBy.mockResolvedValue(getCategoryById(categoryId));

            // Act & Assert
            await expect(productsService.create(createProductDto)).rejects.toThrow(NotFoundException);

            // Verificar la estructura completa de la excepción
            try {
                await productsService.create(createProductDto);
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect(error.response).toMatchObject({
                    statusCode: 404,
                    error: 'Not Found',
                    message: expect.arrayContaining([`The category with ID ${categoryId} does not found`])
                });
            }

            // Verificar que no se llamó save del producto
            expect(mockProductRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return products without category filter', async () => {
            // Arrange
            const expectedProducts = getProductsWithCategory();
            const expectedTotal = expectedProducts.length;
            mockProductRepository.findAndCount.mockResolvedValue([expectedProducts, expectedTotal]);

            // Act
            const result = await productsService.findAll(null, 10, 0);

            // Assert
            expect(mockProductRepository.findAndCount).toHaveBeenCalledWith({
                relations: { category: true },
                order: { id: 'DESC' },
                take: 10,
                skip: 0
            });
            expect(result).toEqual({
                total: expectedTotal,
                products: expectedProducts,
            });
        });

        it('should return products filtered by category', async () => {
            // Arrange
            const categoryId = 2;
            const expectedProducts = getProductsByCategoryWithCategory()
            const expectedTotal = expectedProducts.length;
            mockProductRepository.findAndCount.mockResolvedValue([expectedProducts, expectedTotal]);

            // Act
            const result = await productsService.findAll(categoryId, 10, 0);

            // Assert
            expect(mockProductRepository.findAndCount).toHaveBeenCalledWith({
                relations: { category: true },
                order: { id: 'DESC' },
                take: 10,
                skip: 0,
                where: {
                    category: {
                        id: categoryId
                    }
                }
            });
            expect(result).toEqual({
                total: expectedTotal,
                products: expectedProducts,
            });
        });

        it('should handle pagination correctly', async () => {
            // Arrange
            const expectedProducts = getProductsWithCategory();
            const expectedTotal = expectedProducts.length;
            mockProductRepository.findAndCount.mockResolvedValue([expectedProducts, expectedTotal]);

            // Act
            const result = await productsService.findAll(null, 5, 10);

            // Assert
            expect(mockProductRepository.findAndCount).toHaveBeenCalledWith({
                relations: { category: true },
                order: { id: 'DESC' },
                take: 5,
                skip: 10
            });
            expect(result).toEqual({
                total: expectedTotal,
                products: expectedProducts,
            });
        });

        it('should return empty array when no products found', async () => {
            // Arrange
            mockProductRepository.findAndCount.mockResolvedValue([[], 0]);

            // Act
            const result = await productsService.findAll(null, 10, 0);

            // Assert
            expect(mockProductRepository.findAndCount).toHaveBeenCalledWith({
                relations: { category: true },
                order: { id: 'DESC' },
                take: 10,
                skip: 0
            });
            expect(result).toEqual({
                total: 0,
                products: [],
            });
        });

        it('should handle category filter with pagination', async () => {
            // Arrange
            const categoryId = 2
            const expectedProducts = getProductsByCategoryWithCategory(categoryId)
            const expectedTotal = expectedProducts.length;
            mockProductRepository.findAndCount.mockResolvedValue([expectedProducts, expectedTotal]);

            // Act
            const result = await productsService.findAll(categoryId, 2, 1);

            // Assert
            expect(mockProductRepository.findAndCount).toHaveBeenCalledWith({
                relations: { category: true },
                order: { id: 'DESC' },
                take: 2,
                skip: 1,
                where: {
                    category: {
                        id: categoryId
                    }
                }
            });
            expect(result).toEqual({
                total: expectedTotal,
                products: expectedProducts,
            });
        });
    });
    describe('findOne', () => {
        it('should return a product when found', async () => {
            // Arrange
            const productId = 1;
            const expectedProduct = getProductByIdWithCategory(productId);

            mockProductRepository.findOne.mockResolvedValue(expectedProduct);

            // Act
            const result = await productsService.findOne(productId);

            // Assert
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({
                where: { id: productId },
                relations: { category: true }
            });
            expect(result).toEqual(expectedProduct);
        });

        it('should throw NotFoundException when product not found', async () => {
            // Arrange
            const productId = 999;
            mockProductRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(productsService.findOne(productId)).rejects.toThrow(NotFoundException);

            // Verificar que se llamó findOne con los parámetros correctos
            expect(mockProductRepository.findOne).toHaveBeenCalledWith({
                where: { id: productId },
                relations: { category: true }
            });

            // Verificar la estructura completa de la excepción
            try {
                await productsService.findOne(productId);
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect(error.response.message).toContain(`The product with ID ${productId} does not found`);
            }
        });
    });

    describe('update', () => {
        it('should update a product successfully without changing category', async () => {
            // Arrange
            const productId = 1;
            const updateProductDto: UpdateProductDto = productUpdateDtos[0]
            const existingProduct = getProductByIdWithCategory(productId)
            const expectedProduct = getProductUpdatedByIdAndDto(productId, updateProductDto)
            updateProductDto.categoryId = '';

            const findOneSpy = jest.spyOn(productsService, 'findOne').mockResolvedValue(existingProduct);
            mockProductRepository.save.mockResolvedValue(expectedProduct);

            // Act
            const result = await productsService.update(productId, updateProductDto);

            // Assert
            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockProductRepository.save).toHaveBeenCalledWith({
                ...existingProduct,
                ...updateProductDto
            });
            expect(result).toEqual(expectedProduct);
        });

        it('should update a product and change its category', async () => {
            // Arrange
            const productId = 1;
            const newCategoryId = 2;
            const newCategory = categoriesWithoutProducts.filter((category) => category.id == newCategoryId);
            const updateProductDto: UpdateProductDto = productUpdateDtos[0]
            updateProductDto.categoryId = newCategoryId; 

            const existingProduct = getProductByIdWithCategory(productId)
            const expectedProduct = getProductUpdatedByIdAndDto(productId, updateProductDto)

            const findOneSpy = jest.spyOn(productsService, 'findOne').mockResolvedValue(existingProduct);
            mockCategoryRepository.findOneBy.mockResolvedValue(newCategory);
            mockProductRepository.save.mockResolvedValue(expectedProduct);

            // Act
            const result = await productsService.update(productId, updateProductDto);

            // Assert
            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: newCategoryId });
            expect(mockProductRepository.save).toHaveBeenCalledWith({
                ...existingProduct,
                ...updateProductDto,
                category: newCategory
            });
            expect(result).toEqual(expectedProduct);
        });

        it('should throw NotFoundException when product does not found', async () => {
            // Arrange
            const productId = 998;
            const updateProductDto: UpdateProductDto = productCreateDtos[0]
            const notFoundError = new NotFoundException([`The product with ID ${productId} does not found`]);
            const findOneSpy = jest.spyOn(productsService, 'findOne').mockRejectedValue(notFoundError);

            // Act
            const updatePromise = productsService.update(productId, updateProductDto);

            // Assert
            await expect(updatePromise).rejects.toThrow(NotFoundException);

            try {
                await productsService.update(productId, updateProductDto);
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect(error.response.message).toStrictEqual([`The product with ID ${productId} does not found`]);
            }

            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockCategoryRepository.findOneBy).not.toHaveBeenCalled();
            expect(mockProductRepository.save).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when new category does not found', async () => {
            // Arrange
            const productId = 1;
            const categoryId = 998
            const updateProductDto: UpdateProductDto = productCreateDtos[0]
            updateProductDto.categoryId = categoryId; 
            const existingProduct = getProductByIdWithCategory(productId);

            const findOneSpy = jest.spyOn(productsService, 'findOne').mockResolvedValue(existingProduct);
            mockCategoryRepository.findOneBy.mockResolvedValue(null);

            // Act & Assert
            await expect(productsService.update(productId, updateProductDto)).rejects.toThrow(NotFoundException);

            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: categoryId });
            expect(mockProductRepository.save).not.toHaveBeenCalled()
        });
    });

    describe('remove', () => {
        it('should remove the product if exists the id', async () => {
            // Arrange
            const productId = 1;
            const existingProduct = getProductByIdWithCategory(productId);

            // Usar spyOn para mockear el método findOne reutilizado
            const findOneSpy = jest.spyOn(productsService, 'findOne').mockResolvedValue(existingProduct);
            // Mock del repository para simular la eliminación del objeto encontrado
            mockProductRepository.remove.mockResolvedValue(existingProduct);

            // Act
            const result = await productsService.remove(productId);

            // Assert
            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockProductRepository.remove).toHaveBeenCalledWith(existingProduct);
            expect(result).toEqual(`The Product with ID ${productId} was removed`);
        });

        it('should throw NotFoundException when product does not found', async () => {
            // Arrange
            const productId = 999;
            const notFoundError = new NotFoundException(`The product with ID ${productId} does not found`);

            const findOneSpy = jest.spyOn(productsService, 'findOne').mockRejectedValue(notFoundError);

            // Act & Assert
            await expect(productsService.remove(productId)).rejects.toThrow(NotFoundException);

            expect(findOneSpy).toHaveBeenCalledWith(productId);
            expect(mockProductRepository.remove).not.toHaveBeenCalled();
        });
    });
}); 
