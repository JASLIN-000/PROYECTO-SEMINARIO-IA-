import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plantillas')
export class Plantilla {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  modulo!: string;

  @Column('text')
  plantillaObservacion!: string;

  @Column('text')
  plantillaRecomendacion!: string;
}
