import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('informes_semanales')
export class InformeSemanal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'semana_inicio', type: 'date' })
  semanaInicio!: string;

  @Column({ name: 'semana_fin', type: 'date' })
  semanaFin!: string;

  @Column({ name: 'tecnico_scope', type: 'varchar', length: 120, default: 'TODOS' })
  tecnicoScope!: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'GENERADO' })
  estado!: string;

  @Column({ name: 'pdf_file_path', type: 'text' })
  pdfFilePath!: string;

  @Column({ name: 'pdf_file_name', type: 'varchar', length: 180 })
  pdfFileName!: string;

  @Column({ name: 'payload_json', type: 'text', default: '{}' })
  payloadJson!: string;

  @Column({ name: 'resumen_ejecutivo', type: 'text', nullable: true })
  resumenEjecutivo!: string | null;

  @Column({ name: 'fecha_generacion', type: 'timestamp', default: () => 'NOW()' })
  fechaGeneracion!: Date;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}
