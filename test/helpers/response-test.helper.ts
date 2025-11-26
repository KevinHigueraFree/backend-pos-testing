import { Response } from 'supertest';

/**
 * Helper para verificar respuestas de error comunes
 */
export class ResponseTestHelper {
  /**
   * Verifica una respuesta de error estándar
   */
  static expectErrorResponse(
    response: Response,
    statusCode: number,
    error: string,
    message: string | string[]
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body.error).toBe(error);
    expect(response.body.statusCode).toBe(statusCode);
    
    if (Array.isArray(message)) {
      expect(response.body.message).toStrictEqual(message);
    } else {
      expect(response.body.message).toBe(message);
    }
  }

  /**
   * Verifica una respuesta 404
   */
  static expectNotFound(response: Response, message: string | string[]): void {
    this.expectErrorResponse(response, 404, 'Not Found', message);
  }

  /**
   * Verifica una respuesta 400
   */
  static expectBadRequest(response: Response, message: string | string[]): void {
    this.expectErrorResponse(response, 400, 'Bad Request', message);
  }

  /**
   * Verifica una respuesta 422
   */
  static expectUnprocessableEntity(response: Response, message: string): void {
    this.expectErrorResponse(response, 422, 'Unprocessable Entity', message);
  }
}

