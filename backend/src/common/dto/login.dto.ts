import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  @Matches(/^[a-z]+\.[a-z]+@trazadh\.com$/i, {
    message: 'El usuario debe tener formato primernombre.primerapellido@trazaDH.com',
  })
  usuario!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  rutaNumero?: string;

  @IsString()
  @MinLength(11)
  @MaxLength(100)
  @Matches(/^trazaDH\d{4}$/, {
    message: 'La contrasena debe tener formato trazaDH + 4 ultimos digitos de la cedula.',
  })
  password!: string;
}