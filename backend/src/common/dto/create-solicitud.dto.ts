import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSolicitudDto {
  @IsString()
  @IsIn(['COTIZACION', 'PEDIDO', 'cotizacion', 'pedido'])
  tipoSolicitud!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(4000)
  urlFormulario!: string;

  @IsOptional()
  @IsString()
  @IsIn(['GENERADA', 'ENVIADA', 'ATENDIDA', 'CERRADA'])
  estado?: string;
}
