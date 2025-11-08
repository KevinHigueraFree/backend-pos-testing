import { Controller, Get, Patch, Put } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Put()
  putHello(): string {
    return this.appService.putHello();
  }

  @Patch()
  patchHello(): string{
    return this.appService.patchHello();
  }
}
