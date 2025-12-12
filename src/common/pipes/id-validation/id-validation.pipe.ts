import { BadRequestException, Injectable, ParseIntPipe } from '@nestjs/common';

@Injectable()
export class IdValidationPipe extends ParseIntPipe {
  // con implements PipeTransform dice que sera un pipe que transformará datos
  constructor() {
    super({
      // super es para poder modificar el constructor de alguna clase
      exceptionFactory: () => new BadRequestException('Invalid ID'),
    });
  }
}
