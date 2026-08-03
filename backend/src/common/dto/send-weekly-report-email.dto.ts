import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendWeeklyReportEmailDto {
  @IsEmail()
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
