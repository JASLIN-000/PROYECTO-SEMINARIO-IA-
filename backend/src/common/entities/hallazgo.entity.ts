import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('hallazgos')
export class Hallazgo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'equipo_id' })
  equipoId!: number;

  @Column({ name: 'tipo_mantenimiento' })
  tipoMantenimiento!: string;

  @Column()
  modulo!: string;

  @Column('text', { name: 'descripcion_hallazgo' })
  descripcionHallazgo!: string;

  @Column()
  cotizacion!: string;

  @Column('text', { nullable: true })
  observacion!: string | null;

  @Column()
  estado!: string;

  @Column({ name: 'fecha_hallazgo', type: 'date' })
  fechaHallazgo!: string;

  @Column({ name: 'fecha_solucion', type: 'date', nullable: true })
  fechaSolucion!: string | null;
}
