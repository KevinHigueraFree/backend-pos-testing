# Test Helpers para E2E

Este directorio contiene funciones helper reutilizables para tests de integración (E2E).

## `testInvalidIdE2E`

Función helper para probar la validación de ID inválido en tests E2E.

### Uso

```typescript
import { testInvalidIdE2E } from './helpers/e2e-test.helper';

// Para GET
it('Should return 400 when invalid id', async () => {
  await testInvalidIdE2E(app, 'get', '/categories');
});

// Para PATCH con body
it('Should return 400 when invalid id', async () => {
  const updateDto = { name: 'Updated' };
  await testInvalidIdE2E(app, 'patch', '/categories', 'invalid-id', updateDto);
});

// Para DELETE
it('Should return 400 when invalid id', async () => {
  await testInvalidIdE2E(app, 'delete', '/categories');
});

// Para PUT con body
it('Should return 400 when invalid id', async () => {
  const updateDto = { name: 'Updated' };
  await testInvalidIdE2E(app, 'put', '/categories', 'invalid-id', updateDto);
});
```

### Parámetros

- `app`: La aplicación NestJS (`INestApplication<App>`)
- `method`: Método HTTP ('get', 'patch', 'delete', 'put')
- `endpoint`: El endpoint base (ej: '/categories', '/products', '/coupons', '/transactions')
- `invalidId`: El ID inválido a probar (opcional, por defecto 'invalid-id')
- `body`: Body opcional para métodos que lo requieren (PATCH, PUT)

### Qué verifica

La función automáticamente verifica:
- ✅ Código de estado HTTP 400
- ✅ `response.body.message === 'Invalid ID'`
- ✅ `response.body.error === 'Bad Request'`

### Ejemplos para otros módulos

**Coupons:**
```typescript
// GET /coupons/:id
await testInvalidIdE2E(app, 'get', '/coupons');

// PATCH /coupons/:id
await testInvalidIdE2E(app, 'patch', '/coupons', 'invalid-id', { name: 'New Coupon' });

// DELETE /coupons/:id
await testInvalidIdE2E(app, 'delete', '/coupons');
```

**Transactions:**
```typescript
// GET /transactions/:id
await testInvalidIdE2E(app, 'get', '/transactions');

// DELETE /transactions/:id
await testInvalidIdE2E(app, 'delete', '/transactions');
```

