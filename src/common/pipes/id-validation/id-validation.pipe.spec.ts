import { BadRequestException } from '@nestjs/common';
import { IdValidationPipe } from './id-validation.pipe';

describe('IdValidationPipe', () => {
  let pipe: IdValidationPipe;

  beforeEach(() => {
    pipe = new IdValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should transform valid string number to number', async () => {
    // Arrange
    const inputValue = '123';
    const metadata = { type: 'param', data: 'id' };

    // Act
    const result = await pipe.transform(inputValue, metadata);

    // Assert
    expect(result).toBe(123);
  });

  it('should throw BadRequestException for invalid string', async () => {
    // Arrange
    const inputValue = 'abc';
    const metadata = { type: 'param', data: 'id' };

    // Act & Assert
    await expect(pipe.transform(inputValue, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for empty string', async () => {
    // Arrange
    const inputValue = '';
    const metadata = { type: 'param', data: 'id' };

    // Act & Assert
    await expect(pipe.transform(inputValue, metadata)).rejects.toThrow(BadRequestException);
  });

  it('should have correct error message', async () => {
    // Arrange
    const inputValue = 'invalid';
    const metadata = { type: 'param', data: 'id' };

    // Act & Assert
    try {
      await pipe.transform(inputValue, metadata);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Invalid ID');
    }
  });
});
