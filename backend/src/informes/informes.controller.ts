import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth-request.interface';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { SendWeeklyReportEmailDto } from '../common/dto/send-weekly-report-email.dto';
import { InformesService } from './informes.service';
import { InformesSemanalesService } from './informes-semanales.service';

@Controller('informes')
@UseGuards(AuthTokenGuard)
export class InformesController {
  constructor(
    private readonly informesService: InformesService,
    private readonly informesSemanalesService: InformesSemanalesService,
  ) {}

  @Get()
  findAll() {
    return this.informesService.findAll();
  }

  @Post('preview')
  preview(@Body() body: CreateInformeDto, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.informesService.preview(body, rutaNumero);
  }

  @Post()
  create(@Body() body: CreateInformeDto, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.informesService.create(body, rutaNumero);
  }

  @Patch(':id/finalizar')
  finalize(@Param('id') id: string) {
    return this.informesService.finalize(+id);
  }

  @Get('semanales')
  listWeeklyHistory() {
    return this.informesSemanalesService.listHistory();
  }

  @Post('semanales/generar')
  generateWeekly(@Req() req?: AuthenticatedRequest, @Query('force') force?: string) {
    const forceFlag = String(force || '').trim().toLowerCase() === 'true';
    const tecnico = req?.auth?.nombre || 'Todos los tecnicos';
    return this.informesSemanalesService.generateManually(tecnico, forceFlag);
  }

  @Get('semanales/:id/pdf')
  async downloadWeeklyPdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.informesSemanalesService.getPdfInfo(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.pdfFileName}"`);
    createReadStream(report.pdfFilePath).pipe(res);
  }

  @Get('semanales/:id/pdf-preview')
  async previewWeeklyPdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.informesSemanalesService.getPdfInfo(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.pdfFileName}"`);
    createReadStream(report.pdfFilePath).pipe(res);
  }

  @Post('semanales/:id/enviar-correo')
  sendWeeklyByEmail(@Param('id') id: string, @Body() body: SendWeeklyReportEmailDto) {
    return this.informesSemanalesService.sendByEmail(+id, body);
  }
}
