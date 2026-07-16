import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plantillas')
export class Plantilla {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  modulo!: string;

  @Column('text', { name: 'observacion_estandar' })
  observacionEstandar!: string;
}
