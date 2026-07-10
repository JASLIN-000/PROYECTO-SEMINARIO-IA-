import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipos')
export class Equipo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column()
  acuerdoNivelServicio!: string;

  @Column()
  estado!: string;

  @Column({ default: true })
  diaHabil!: boolean;
}
