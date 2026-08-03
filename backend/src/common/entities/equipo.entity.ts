import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipos')
export class Equipo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'id_equipo' })
  idEquipo!: string;

  @Column({ name: 'nombre_equipo' })
  nombreEquipo!: string;

  @Column({ name: 'acuerdo_nivel_servicio_dh' })
  acuerdoNivelServicioDh!: number;

  @Column()
  estado!: string;

  @Column({ name: 'ruta_numero', type: 'varchar', length: 20, nullable: true })
  rutaNumero!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion!: string | null;

  @Column({ name: 'ultimo_mantenimiento', type: 'date', nullable: true })
  ultimoMantenimiento!: string | null;

  @Column({ name: 'proximo_mantenimiento', type: 'date', nullable: true })
  proximoMantenimiento!: string | null;

  @Column({ name: 'tecnico_responsable', type: 'varchar', length: 120, nullable: true })
  tecnicoResponsable!: string | null;

  @Column({ name: 'ingeniero_responsable', type: 'varchar', length: 120, nullable: true })
  ingenieroResponsable!: string | null;

  @Column({ name: 'ejecutiva_cuenta', type: 'varchar', length: 120, nullable: true })
  ejecutivaCuenta!: string | null;

  @Column({ name: 'tipo_contrato', type: 'varchar', length: 5, nullable: true })
  tipoContrato!: string | null;

  @Column({ name: 'programacion_sabado_semana', type: 'smallint', nullable: true })
  programacionSabadoSemana!: number | null;
}
