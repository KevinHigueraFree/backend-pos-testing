# Test Helpers

Este directorio contiene funciones helper reutilizables para las pruebas unitarias.

## Validation Test Helper

### `testInvalidIdValidation(id, expectedMessage?)`

Prueba la validación de ID inválido usando el `IdValidationPipe`.

**Parámetros:**
- `id: any` - El ID a validar
- `expectedMessage: string` - Mensaje de error esperado (opcional, por defecto "Invalid ID")

**Ejemplo:**
```typescript
import { testInvalidIdValidation } from '../common/test-helpers/validation-test.helper';

it('should throw BadRequestException for invalid ID', async () => {
  await testInvalidIdValidation('invalid-id');
});
```

### `expectServiceNotCalled(service, methodName)`

Verifica que un servicio NO fue llamado.

**Parámetros:**
- `service: any` - El servicio mock
- `methodName: string` - Nombre del método del servicio

**Ejemplo:**
```typescript
import { expectServiceNotCalled } from '../common/test-helpers/validation-test.helper';

it('should not call service when validation fails', async () => {
  expectServiceNotCalled(productsService, 'findOne');
});
```

### `testInvalidIdWithServiceValidation(id, service, methodName, expectedMessage?)`

Función combinada que prueba la validación de ID y verifica que el servicio no fue llamado.

**Parámetros:**
- `id: any` - El ID a validar
- `service: any` - El servicio mock
- `methodName: string` - Nombre del método del servicio
- `expectedMessage: string` - Mensaje de error esperado (opcional)

**Ejemplo:**
```typescript
import { testInvalidIdWithServiceValidation } from '../common/test-helpers/validation-test.helper';

it('should throw BadRequestException for invalid ID and not call service', async () => {
  await testInvalidIdWithServiceValidation('invalid-id', productsService, 'findOne');
});
```

## Uso en Controladores

### Products Controller
```typescript
describe('findOne', () => {
  it('should throw BadRequestException for invalid ID and not call service', async () => {
    const productId = 'abc';
    await testInvalidIdWithServiceValidation(productId, productsService, 'findOne');
  });
});
```

### Categories Controller
```typescript
describe('update', () => {
  it('should throw BadRequestException for invalid ID in update and not call service', async () => {
    const categoryId = 'invalid-id';
    await testInvalidIdWithServiceValidation(categoryId, service, 'update');
  });
});
```

## Beneficios

1. **Reutilización**: Las mismas funciones pueden usarse en múltiples controladores
2. **Consistencia**: Todas las pruebas de validación siguen el mismo patrón
3. **Mantenibilidad**: Cambios en la lógica de validación se aplican automáticamente a todas las pruebas
4. **Legibilidad**: Las pruebas son más claras y concisas
5. **DRY**: Evita duplicación de código en las pruebas
