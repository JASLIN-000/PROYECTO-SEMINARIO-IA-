import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateMantenimientoDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  equipoId!: number;

  @IsDateString()
  fechaMantenimiento!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'INSPECCION'])
  tipoMantenimiento: string = 'PREVENTIVO';
}
