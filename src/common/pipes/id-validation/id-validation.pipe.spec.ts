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
    const result = await pipe.transform('123', { type: 'param', data: 'id' });
    expect(result).toBe(123);
  });

  it('should throw BadRequestException for invalid string', async () => {
    await expect(pipe.transform('abc', { type: 'param', data: 'id' })).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for empty string', async () => {
    await expect(pipe.transform('', { type: 'param', data: 'id' })).rejects.toThrow(BadRequestException);
  });

  it('should have correct error message', async () => {
    try {
      await pipe.transform('invalid', { type: 'param', data: 'id' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Invalid ID');
    }
  });
});
