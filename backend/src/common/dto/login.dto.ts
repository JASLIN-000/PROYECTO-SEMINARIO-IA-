import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(4)
  @MaxLength(30)
  cedula!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  rutaNumero!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(100)
  password!: string;
}