import { DataSource } from 'typeorm';
import { Category } from '../../src/categories/entities/category.entity';
import { CreateCategoryDto } from '../../src/categories/dto/create-category.dto';
import { categoryCreateDtos } from '../../src/common/test-data';

/**
 * Helper para crear datos de prueba comunes en tests de categorías
 */
export class CategoryTestHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Crea una categoría de prueba
   */
  async createCategory(dto?: CreateCategoryDto): Promise<Category> {
    const categoryRepository = this.dataSource.getRepository(Category);
    const createDto = dto || categoryCreateDtos[0];
    return await categoryRepository.save({ ...createDto });
  }

  /**
   * Crea múltiples categorías de prueba
   */
  async createCategories(count: number = 2): Promise<Category[]> {
    const categories: Category[] = [];
    for (let i = 0; i < count && i < categoryCreateDtos.length; i++) {
      categories.push(await this.createCategory(categoryCreateDtos[i]));
    }
    return categories;
  }
}
