// Exportar datos de prueba directamente desde archivos JSON
import * as fs from 'fs';
import * as path from 'path';
import { UpdateCategoryDto } from '../../categories/dto/update-category.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';
import { UpdateCouponDto } from '../../coupons/dto/update-coupon.dto';

// Cargar datos de productos
const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));

// Cargar datos de categorías
const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories.json'), 'utf8'));

// Cargar datos de coupons
const couponsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'coupons.json'), 'utf8'));

// Exportar datos de productos
export const products = productsData.products;
export const productCreateDtos = productsData.createProductDtos;
export const productUpdateDtos = productsData.updateProductDtos;
export const productCategories = productsData.categories;

// Exportar datos de categorías
export const categories = categoriesData.categories;
export const updatedCategories = categoriesData.updatedCategories;
export const categoryCreateDtos = categoriesData.createDtos;
export const categoryUpdateDtos = categoriesData.updateDtos;
export const categoriesWithProducts = categoriesData.categoriesWithProducts;
export const categoriesWithoutProducts = categoriesData.categoriesWithoutProducts;

// Exportar datos de coupons
export const coupons = couponsData.coupons;
export const couponCreateDtos = couponsData.createCouponDtos;
export const couponUpdateDtos = couponsData.updateCouponDtos;
export const updatedCoupons = couponsData.updatedCoupons;

// Funciones helper simples
export const getProductById = (id: number) => products.find((product) => product.id === id);

export const getCategoryById = (id: number) => categories.find((category) => category.id === id);

// Funciones helper para coupons
export const getCouponById = (id: number) => coupons.find((coupon) => coupon.id === id);

export const getCouponByName = (name: string) => coupons.find((coupon) => coupon.name === name);

export const getCouponByField = <K extends keyof (typeof coupons)[0]>(
  field: K,
  value: (typeof coupons)[0][K]
) => coupons.find((coupon) => coupon[field] === value);

export const getCouponUpdatedByIdAndDto = (id: number, couponUpdatedDto: UpdateCouponDto) => {
  const existing = coupons.find((coupon) => coupon.id === id);
  if (!existing) return undefined;

  // Merge shallowly: existing fields overridden by DTO
  const merged = {
    ...existing,
    ...couponUpdatedDto,
    id: existing.id, // ensure id remains the same
  };

  return merged;
};

export const getCategoryUpdatedByIdAndDto = (id: number, categoryUpdatedDto: UpdateCategoryDto) => {
  const existing = categories.find((category) => category.id === id);
  if (!existing) return undefined;

  // Merge shallowly: existing fields overridden by DTO
  const merged = {
    ...existing,
    ...categoryUpdatedDto,
    id: existing.id, // ensure id remains the same
  };

  return merged;
};

// Retornar un producto actualizado con DTO
export const getProductUpdatedByIdAndDto = (id: number, productUpdatedDto: UpdateProductDto) => {
  const existing = products.find((product) => product.id === id);
  if (!existing) return undefined;

  // Obtener la categoría si viene en el DTO o mantener la existente
  const categoryId = productUpdatedDto.categoryId ?? existing.categoryId;
  const category = categories.find((cat) => cat.id === categoryId);

  // Merge shallowly: existing fields overridden by DTO
  const merged = {
    ...existing,
    ...productUpdatedDto,
    id: existing.id, // ensure id remains the same
    categoryId: categoryId, // usar el categoryId del DTO o el existente
    category: category || null, // incluir la categoría si existe
  };

  return merged;
};

export const getProductsByCategory = (categoryId: number) =>
  products.filter((product) => product.categoryId === categoryId);

export const getLowInventoryProducts = (threshold: number = 20) =>
  products.filter((product) => product.inventory < threshold);

export const getHighPriceProducts = (threshold: number = 1000) =>
  products.filter((product) => product.price > threshold);

// Retornar todos los productos con sus categorías incluidas
export const getProductsWithCategory = () => {
  // Crear un mapa de categorías por ID para mejor rendimiento
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

  return products.map((product) => ({
    ...product,
    category: categoryMap.get(product.categoryId) || null,
  }));
};

// Retornar un producto específico con su categoría
export const getProductByIdWithCategory = (id: number) => {
  const product = products.find((p) => p.id === id);
  if (!product) return undefined;

  const category = categories.find((cat) => cat.id === product.categoryId);
  return {
    ...product,
    category: category || null,
  };
};

// Retornar productos de una categoría específica con la categoría incluida
export const getProductsByCategoryWithCategory = (categoryId: number) => {
  return getProductsByCategory(categoryId).map((product) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return {
      ...product,
      category: category || null,
    };
  });
};

// ============================================
// Funciones helper para datos de transacciones
// ============================================

// Constantes comunes para IDs de transacciones
export const TRANSACTION_TEST_IDS = {
  transactionId: 1,
  transactionContentId1: 1,
  transactionContentId2: 2,
  productId1: 1,
  productId2: 2,
  transactionIdNotFound: 999,
  productIdNotFound: 999,
} as const;

// Crear un TransactionContent de prueba
export const getTransactionContent = (
  transactionContentId: number,
  productId: number,
  quantity: number = 2,
  price: string | number = '100'
) => {
  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product with id ${productId} not found in test data`);
  }
  return {
    id: transactionContentId,
    quantity,
    price: String(price),
    product,
  };
};

// Crear una transacción esperada
export const getExpectedTransaction = (
  transactionId: number,
  total: string | number,
  coupon: string | null,
  discount: string | number,
  transactionDate: string,
  contents: any[]
) => {
  return {
    id: transactionId,
    total: String(total),
    coupon,
    discount: String(discount),
    transactionDate,
    contents,
  };
};

// Crear mensaje de eliminación de transacción
export const getTransactionRemovalMessage = (transactionId: number) => {
  return { message: `The Transaction with ID ${transactionId} was removed` };
};

// Calcular inventario esperado después de una transacción
export const getExpectedInventory = (product: any, transactionContent: any) => {
  return product.inventory + transactionContent.quantity;
};

// Crear datos de transacción completos para tests de remove
export const getTransactionTestData = () => {
  const transactionId = TRANSACTION_TEST_IDS.transactionId;
  const transactionContentId1 = TRANSACTION_TEST_IDS.transactionContentId1;
  const transactionContentId2 = TRANSACTION_TEST_IDS.transactionContentId2;
  const productId1 = TRANSACTION_TEST_IDS.productId1;
  const productId2 = TRANSACTION_TEST_IDS.productId2;

  const product1 = getProductById(productId1);
  const product2 = getProductById(productId2);

  const transactionContent1 = getTransactionContent(transactionContentId1, productId1, 2, '100');
  const transactionContent2 = getTransactionContent(transactionContentId2, productId2, 10, '100');

  const expectedMessage = getTransactionRemovalMessage(transactionId);
  const expectedInventory1 = getExpectedInventory(product1, transactionContent1);
  const expectedInventory2 = getExpectedInventory(product2, transactionContent2);

  const existTransaction = getExpectedTransaction(
    5,
    '240',
    'navidad',
    '960',
    '2025-12-11T02:36:49.95Z',
    [transactionContent1, transactionContent2]
  );

  return {
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
  };
};
