import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tecnicos_acceso')
export class TecnicoAcceso {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'usuario', unique: true, length: 120 })
  usuario!: string;

  @Column({ unique: true, length: 30 })
  cedula!: string;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ name: 'ruta_numero', length: 20 })
  rutaNumero!: string;

  @Column({ name: 'password_hash', length: 64 })
  passwordHash!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}