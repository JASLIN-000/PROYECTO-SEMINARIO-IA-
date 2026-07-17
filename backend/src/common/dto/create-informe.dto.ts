import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateInformeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mantenimientoId?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  equipoId?: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  equipoCodigo?: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modulo?: string = '';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modulos?: string[] = [];

  @IsOptional()
  @IsString()
  observaciones?: string = '';

  @IsOptional()
  @IsString()
  pendientes?: string = '';

  @IsOptional()
  @IsString()
  recomendaciones?: string = '';
}
