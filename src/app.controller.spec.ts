import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      // Arrange: No necesitamos preparar nada especial
      
      // Act: Ejecutamos el método
      const result = appController.getHello();
      
      // Assert: Verificamos el resultado
      expect(result).toBe('Hello World!');
    });
  });

  describe('putHello', () => {
    it('should return "Hola put"', () => {
      const result = appController.putHello();
      expect(result).toBe('Hola put');
    });
  });

  describe('patchHello', () => {
    it('should return "hola patch"', () => {
      const result = appController.patchHello();
      expect(result).toBe('hola patch');
    });
  });
});
