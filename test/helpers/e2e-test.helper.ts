import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';

/**
 * Helper function para probar validación de ID inválido en tests E2E
 *
 * @param app - La aplicación NestJS
 * @param method - Método HTTP ('get', 'patch', 'delete', etc.)
 * @param endpoint - El endpoint base (ej: '/categories', '/products')
 * @param invalidId - El ID inválido a probar (por defecto 'invalid-id')
 * @param body - Body opcional para métodos que lo requieren (PATCH, PUT, etc.)
 *
 * @example
 * // Para GET
 * await testInvalidIdE2E(app, 'get', '/categories', 'invalid-id');
 *
 * @example
 * // Para PATCH con body
 * await testInvalidIdE2E(app, 'patch', '/categories', 'invalid-id', { name: 'Test' });
 *
 * @example
 * // Para DELETE
 * await testInvalidIdE2E(app, 'delete', '/categories', 'invalid-id');
 */
export async function testInvalidIdE2E(
  app: INestApplication<App>,
  method: 'get' | 'patch' | 'delete' | 'put',
  endpoint: string,
  invalidId: string = 'invalid-id',
  body?: any
): Promise<Response> {
  const url = `${endpoint}/${invalidId}`;
  let response: Response;

  switch (method.toLowerCase()) {
    case 'get':
      response = await request(app.getHttpServer()).get(url).expect(400);
      break;
    case 'patch':
      response = await request(app.getHttpServer())
        .patch(url)
        .send(body || {})
        .expect(400);
      break;
    case 'put':
      response = await request(app.getHttpServer())
        .put(url)
        .send(body || {})
        .expect(400);
      break;
    case 'delete':
      response = await request(app.getHttpServer()).delete(url).expect(400);
      break;
    default:
      throw new Error(`Método HTTP no soportado: ${method}`);
  }

  // Verificar la estructura de la respuesta de error
  expect(response.body).toHaveProperty('message');
  expect(response.body.message).toBe('Invalid ID');
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toBe('Bad Request');

  return response;
}
