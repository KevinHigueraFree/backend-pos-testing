# Test Data - Archivos JSON

Este directorio contiene archivos JSON con datos de prueba que se pueden usar directamente en las pruebas unitarias.

## Estructura

```
src/common/test-data/
├── products.json          # Datos de productos
├── categories.json        # Datos de categorías
└── index.ts              # Exportaciones y funciones helper
```

## Uso

### Importar datos directamente

```typescript
import { 
  products, 
  productCreateDtos, 
  productUpdateDtos,
  categories,
  categoryCreateDtos,
  getProductById,
  getCategoryById,
  getProductsByCategory
} from '../common/test-data';
```

### Ejemplos de uso

```typescript
// Obtener un producto específico
const product = getProductById(1);

// Obtener una categoría específica
const category = getCategoryById(1);

// Obtener DTOs de creación
const createProductDto = productCreateDtos[0];
const createCategoryDto = categoryCreateDtos[0];

// Obtener DTOs de actualización
const updateProductDto = productUpdateDtos[0];
const updateCategoryDto = categoryUpdateDtos[0];

// Obtener productos por categoría
const electronicsProducts = getProductsByCategory(1);

// Obtener todos los productos
const allProducts = products;

// Obtener todas las categorías
const allCategories = categories;
```

### En las pruebas

```typescript
describe('ProductsController', () => {
  it('should create a new product', async () => {
    // Arrange
    const createProductDto = productCreateDtos[0];
    const expectedProduct = {
      ...getProductById(1),
      category: getCategoryById(1)
    };

    mockProductsService.create.mockResolvedValue(expectedProduct);

    // Act
    const result = await productsController.create(createProductDto);

    // Assert
    expect(result).toEqual(expectedProduct);
  });
});
```

## Ventajas

1. **Simplicidad**: No necesitas factories complejos
2. **Datos centralizados**: Todos los datos en archivos JSON
3. **Fácil mantenimiento**: Cambiar datos es editar JSON
4. **Reutilización**: Los mismos datos en todas las pruebas
5. **Legibilidad**: Los datos son fáciles de leer
6. **Versionado**: Los cambios se trackean en Git

## Funciones Helper Disponibles

### Productos básicos
- `getProductById(id)` - Obtener producto por ID
- `getCategoryById(id)` - Obtener categoría por ID
- `getProductsByCategory(categoryId)` - Filtrar productos por categoría
- `getLowInventoryProducts(threshold)` - Productos con inventario bajo
- `getHighPriceProducts(threshold)` - Productos con precio alto

### Productos con categorías
- `getProductsWithCategory()` - **Todos los productos con sus categorías incluidas**
- `getProductByIdWithCategory(id)` - **Un producto específico con su categoría**
- `getProductsByCategoryWithCategory(categoryId)` - **Productos de una categoría con la categoría incluida**

### Categorías
- `getCategoryById(id)` - Obtener categoría por ID
- `getCategoryUpdatedByIdAndDto(id, dto)` - Obtener categoría actualizada con DTO

### Actualización de productos
- `getProductUpdatedByIdAndDto(id, dto)` - **Obtener producto actualizado con DTO y categoría incluida**

### Ejemplos de uso con categorías

```typescript
// Obtener todos los productos con sus categorías
const productsWithCategories = getProductsWithCategory();
// Resultado: [{ id: 1, name: "Laptop", category: { id: 1, name: "Electronics" }, ... }, ...]

// Obtener un producto específico con su categoría
const productWithCategory = getProductByIdWithCategory(1);
// Resultado: { id: 1, name: "Laptop", category: { id: 1, name: "Electronics" }, ... }

// Obtener productos de una categoría con la categoría incluida
const electronicsProducts = getProductsByCategoryWithCategory(1);
// Resultado: [{ id: 1, name: "Laptop", category: { id: 1, name: "Electronics" }, ... }, ...]

// Obtener producto actualizado con DTO
const updateDto = productUpdateDtos[0];
const updatedProduct = getProductUpdatedByIdAndDto(1, updateDto);
// Resultado: { id: 1, name: "Updated Laptop", price: 1800, category: { id: 1, name: "Electronics" }, ... }
```

## Agregar nuevos datos

Para agregar nuevos datos de prueba, simplemente edita los archivos JSON correspondientes:

- `products.json` - Para datos de productos
- `categories.json` - Para datos de categorías

Los datos estarán disponibles inmediatamente en todas las pruebas que importen desde `../common/test-data`.

