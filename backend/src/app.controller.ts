import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHome(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }

  @Get('health')
  getHello(): string {
    return this.appService.getHello();
  }
}
