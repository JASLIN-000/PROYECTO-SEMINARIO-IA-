import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('hallazgos')
export class Hallazgo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  equipoId!: number;

  @Column()
  estado!: string;

  @Column('text')
  descripcion!: string;

  @Column({ default: false })
  requiereCotizacion!: boolean;

  @Column({ type: 'date' })
  fechaMantenimiento!: string;
}
