import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      // Arrange: No necesitamos datos de entrada
      
      // Act: Llamamos al método
      const result = service.getHello();
      
      // Assert: Verificamos el resultado
      expect(result).toBe('Hello World!');
      expect(typeof result).toBe('string');
      expect(result).toHaveLength(12);
    });
  });

  describe('putHello', () => {
    it('should return "Hola put"', () => {
      const result = service.putHello();
      expect(result).toBe('Hola put');
    });
  });

  describe('patchHello', () => {
    it('should return "hola patch"', () => {
      const result = service.patchHello();
      expect(result).toBe('hola patch');
    });
  });

  // Ejemplo de test con múltiples verificaciones
  describe('all methods return strings', () => {
    it('should return strings from all methods', () => {
      const methods = [
        service.getHello(),
        service.putHello(),
        service.patchHello()
      ];

      methods.forEach(method => {
        expect(typeof method).toBe('string');
        expect(method.length).toBeGreaterThan(0);
      });
    });
  });
});
