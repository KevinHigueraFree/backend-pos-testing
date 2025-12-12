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
      // Arrange - No input data needed

      // Act
      const result = service.getHello();

      // Assert
      expect(result).toBe('Hello World!');
      expect(typeof result).toBe('string');
      expect(result).toHaveLength(12);
    });
  });

  describe('putHello', () => {
    it('should return "Hola put"', () => {
      // Arrange - No input data needed

      // Act
      const result = service.putHello();

      // Assert
      expect(result).toBe('Hola put');
    });
  });

  describe('patchHello', () => {
    it('should return "hola patch"', () => {
      // Arrange - No input data needed

      // Act
      const result = service.patchHello();

      // Assert
      expect(result).toBe('hola patch');
    });
  });

  // Example test with multiple verifications
  describe('all methods return strings', () => {
    it('should return strings from all methods', () => {
      // Arrange
      const methods = [service.getHello(), service.putHello(), service.patchHello()];

      // Act & Assert
      methods.forEach((method) => {
        expect(typeof method).toBe('string');
        expect(method.length).toBeGreaterThan(0);
      });
    });
  });
});
