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
}
