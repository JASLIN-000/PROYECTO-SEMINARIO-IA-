import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud!: number;

  @Column({ name: 'id_hallazgo', type: 'bigint' })
  idHallazgo!: number;

  @Column({ name: 'id_equipo', type: 'bigint' })
  idEquipo!: number;

  @Column({ name: 'tipo_solicitud', type: 'varchar', length: 20 })
  tipoSolicitud!: 'COTIZACION' | 'PEDIDO';

  @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'NOW()' })
  fechaCreacion!: Date;

  @Column({ name: 'usuario_solicitante', type: 'varchar', length: 160 })
  usuarioSolicitante!: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'GENERADA' })
  estado!: 'GENERADA' | 'ENVIADA' | 'ATENDIDA' | 'CERRADA';

  @Column({ name: 'url_formulario', type: 'text' })
  urlFormulario!: string;

  @Column({ name: 'fecha_apertura_formulario', type: 'timestamp', nullable: true })
  fechaAperturaFormulario!: Date | null;
}
