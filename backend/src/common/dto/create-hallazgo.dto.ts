import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateHallazgoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mantenimientoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mantenimiento_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  equipoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  equipo_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  idEquipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoEquipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoMantenimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_mantenimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modulo?: string;

  @IsOptional()
  @IsString()
  descripcionHallazgo?: string;

  @IsOptional()
  @IsString()
  descripcion_hallazgo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SI', 'NO', 'NA', 'N/A', 'SÍ', 'si', 'no', 'na', 'n/a'])
  cotizacion?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiereCotizacion?: boolean;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ABIERTO', 'PENDIENTE', 'SOLUCIONADO', 'CERRADO', 'abierto', 'pendiente', 'solucionado', 'cerrado'])
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaHallazgo?: string;

  @IsOptional()
  @IsDateString()
  fecha_hallazgo?: string;

  @IsOptional()
  @IsDateString()
  fechaMantenimiento?: string;

  @IsOptional()
  @IsDateString()
  fechaSolucion?: string;

  @IsOptional()
  @IsDateString()
  fecha_solucion?: string;
}
