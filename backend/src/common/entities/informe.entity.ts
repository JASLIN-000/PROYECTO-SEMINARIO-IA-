import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('informes')
export class Informe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'mantenimiento_id', type: 'integer', nullable: true })
  mantenimientoId!: number | null;

  @Column({ name: 'equipo_id', type: 'bigint', nullable: true })
  equipoId!: number | null;

  @Column('text', { name: 'modulos_text', default: '[]' })
  modulosText!: string;

  @Column('text')
  observaciones!: string;

  @Column('text', { nullable: true })
  pendientes!: string | null;

  @Column('text', { nullable: true })
  recomendaciones!: string | null;

  @Column('text', { name: 'plantillas_aplicadas_text', default: '[]' })
  plantillasAplicadasText!: string;

  @Column({ name: 'fecha_generacion', type: 'timestamp', default: () => 'NOW()' })
  fechaGeneracion!: Date;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}
