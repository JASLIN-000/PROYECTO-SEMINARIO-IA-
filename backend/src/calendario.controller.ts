import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  getBusinessDayContext,
  getBusinessDaysForMonth,
  loadConfiguredHolidaySet,
} from './common/utils/business-days';

@Controller('calendario')
export class CalendarioController {
  @Get('mes')
  async getMonth(@Query('fecha') fecha?: string) {
    const targetDate = this.parseTargetDate(fecha);
    const holidays = await loadConfiguredHolidaySet(targetDate);
    const calendario = getBusinessDayContext(targetDate, holidays);
    const diasHabiles = getBusinessDaysForMonth(targetDate, holidays);

    return {
      ok: true,
      calendario,
      diasHabiles,
    };
  }

  private parseTargetDate(fecha?: string) {
    if (!fecha?.trim()) {
      return new Date();
    }

    const value = fecha.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('El parametro fecha debe tener formato YYYY-MM-DD.');
    }

    const parsed = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('El parametro fecha no es valido.');
    }

    return parsed;
  }
}