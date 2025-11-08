import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  putHello():string {
    return 'Hola put';
  }
  patchHello(): string{
    return 'hola patch'
  }
}
