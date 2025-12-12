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
      // Arrange - No special setup needed

      // Act
      const result = appController.getHello();

      // Assert
      expect(result).toBe('Hello World!');
    });
  });

  describe('putHello', () => {
    it('should return "Hola put"', () => {
      // Arrange - No special setup needed

      // Act
      const result = appController.putHello();

      // Assert
      expect(result).toBe('Hola put');
    });
  });

  describe('patchHello', () => {
    it('should return "hola patch"', () => {
      // Arrange - No special setup needed

      // Act
      const result = appController.patchHello();

      // Assert
      expect(result).toBe('hola patch');
    });
  });
});
