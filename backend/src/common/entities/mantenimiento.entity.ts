import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Equipo } from './equipo.entity';

@Entity('mantenimientos')
export class Mantenimiento {
  @PrimaryGeneratedColumn({ name: 'id_mantenimiento' })
  idMantenimiento!: number;

  @Column({ name: 'equipo_id', type: 'bigint' })
  equipoId!: number;

  @ManyToOne(() => Equipo, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Equipo;

  @Column({ name: 'fecha_mantenimiento', type: 'date' })
  fechaMantenimiento!: string;

  @Column({ name: 'tipo_mantenimiento', type: 'varchar', length: 50 })
  tipoMantenimiento!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}
